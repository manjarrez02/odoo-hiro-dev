from collections import defaultdict

from odoo import http
from odoo.http import request


class ViinMap(http.Controller):

    @http.route('/viin_map/update_latitude_longitude', type='json', auth='user', website=True)
    def update_latitude_longitude(self, partners, **kw):
        if request.env.user.has_group('base.group_user') and partners:
            partners_data = defaultdict(list)

            for partner in partners:
                if 'id' in partner and 'partner_latitude' in partner and 'partner_longitude' in partner:
                    partners_data[(partner['partner_latitude'], partner['partner_longitude'])].append(partner['id'])

            prefetch_partner_ids = [p_id for p_ids in list(partners_data.values()) for p_id in p_ids]
            for values, partner_ids in partners_data.items():
                # NOTE this should be done in sudo to avoid crashing as soon as the view is used
                partners = request.env['res.partner'].sudo().with_prefetch(prefetch_partner_ids).browse(partner_ids).exists()
                if partners:
                    partners._update_latitude_longitude(values[0], values[1])
        return {}

    @http.route('/viin_map/fetch_coordinate_from_address', type='json', auth='user', website=True, csrf=False)
    def fetch_coordinate_from_address(self, partner_id, **kw):
        partner = request.env['res.partner'].browse(partner_id).sudo().exists()
        geo = partner.geo_find()
        if geo:
            geo = geo[0]
        return geo
