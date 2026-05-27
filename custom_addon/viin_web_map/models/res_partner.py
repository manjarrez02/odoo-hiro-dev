import logging

from odoo import api, fields, models
from odoo.tools import relativedelta

_logger = logging.getLogger(__name__)


class ResPartner(models.Model):
    _inherit = 'res.partner'

    mapping_address = fields.Char(string='Mapping Address', compute='_compute_mapping_address', compute_sudo=True,
                                   help="The complete address of the partner which will be used for map view")
    failed_coordinate_filling_times = fields.Integer(
        help="Store number of times that the schedule action `coordinate filling` got failure on this records"
        )

    def _update_latitude_longitude(self, partner_latitude, partner_longitude):
        self.write({
            'partner_latitude': partner_latitude,
            'partner_longitude': partner_longitude,
            'date_localization': fields.Date.context_today(self)
            })

    def _get_geocoder_context(self):
        self.ensure_one()
        ctx = dict(self._context)
        if self.is_company:
            ctx.update(force_partner_company_name=self.name)
        elif self.parent_id and self.parent_id.is_company:
            ctx.update(force_partner_company_name=self.parent_id.name)
        return ctx

    def geo_find(self):
        res = []
        for r in self:
            geocoder_sudo = r.env['base.geocoder'].sudo().with_context(r._get_geocoder_context())
            addr = geocoder_sudo.geo_query_address(
                r.street or None,
                r.zip or None,
                r.city or None,
                r.state_id.name or None,
                r.country_id.name or None
                )
            if r.country_id:
                coord = geocoder_sudo.geo_find(addr)
            else:
                coord = geocoder_sudo.geo_find(addr, force_country=self.env.company.country_id.name)
            if coord:
                res.append({
                    'lat': coord[0],
                    'lon': coord[1]
                    })
        return res

    @api.depends('street', 'street2', 'zip', 'city', 'country_id')
    def _compute_mapping_address(self):
        for record in self.with_context(lang='en_US'):
            mapping_address = ''
            if record.street:
                mapping_address += record.street + ','
            if record.street2:
                mapping_address += record.street2 + ','
            if record.zip:
                mapping_address += record.zip + ' '
            if record.city:
                mapping_address += record.city + ','
            if record.country_id:
                mapping_address += record.country_id.name
            record.mapping_address = mapping_address or False

    @api.model
    def _prepare_cron_fill_coordinates_domain(self):
        return [
            # geo providers usually require country to be specified
            '&', ('country_id', '!=', False),
            '|', '|', '|', ('partner_latitude', '=', False), ('partner_longitude', '=', False),
            ('partner_latitude', '=', 0.0), ('partner_longitude', '=', 0.0),
            # retry after 1 week
            '|', ('date_localization', '<', fields.Date.today() - relativedelta(days=7)), ('date_localization', '=', False),
            # don't try to fill coordinate after 3 attempts.
            # we will be charged more money by providers
            '|', ('failed_coordinate_filling_times', '<', 3), ('failed_coordinate_filling_times', '=', False),
        ]

    @api.model
    def _cron_fill_coordinates(self, jobs_count=20):
        """
        @param int jobs_count: maximum partners to process per call. Keep it small to avoid to block some
            operations too offent when cron is running as this calls external web services
        """
        BATCH_SIZE = jobs_count or 20
        domain = self._prepare_cron_fill_coordinates_domain()
        partners = self.env['res.partner'].search(domain, limit=BATCH_SIZE + 1)
        to_process = partners[:BATCH_SIZE]
        if to_process:
            to_process.geo_localize()
            failure = to_process.filtered_domain(domain)
            if failure:
                self.env.cr.execute("""
                UPDATE res_partner
                SET failed_coordinate_filling_times = COALESCE(failed_coordinate_filling_times, 0) + 1,
                date_localization = %s
                WHERE id IN %s
                """, (fields.Date.to_string(fields.Date.today()), tuple(failure.ids)))
        if len(partners) > BATCH_SIZE:
            self.env.ref('viin_web_map.ir_cron_fill_coordinates')._trigger()
