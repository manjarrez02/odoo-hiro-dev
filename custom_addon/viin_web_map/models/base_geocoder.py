import logging
import requests
import json

from requests.utils import quote

from odoo import api, models

_logger = logging.getLogger(__name__)


class GeoCoder(models.AbstractModel):
    _inherit = "base.geocoder"

    @api.model
    def _geo_query_address_default(self, street=None, zip=None, city=None, state=None, country=None):  # pylint: disable=redefined-builtin
        res = super(GeoCoder, self)._geo_query_address_default(street, zip, city, state, country)
        force_partner_company_name = self._context.get('force_partner_company_name', '')
        if force_partner_company_name:
            res = '%s, %s' % (force_partner_company_name, res)
        return res

    @api.model
    def _geo_query_address_mapbox(self, street=None, zip=None, city=None, state=None, country=None):  # pylint: disable=redefined-builtin
        if country:
            country = self.env['res.country'].with_context(lang='en_US').search([('name', '=', country)], limit=1)
            if country:
                country = country.code
        return self._geo_query_address_default(street, zip, city, state, country)

    @api.model
    def _call_mapbox(self, addr, **kw):
        url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + quote(addr.encode('utf-8')) + '.json'
        access_token = self.env['ir.config_parameter'].sudo().get_param('viin_web_map.mapbox_token')
        params = {'cachebuster': '1552314159970', 'access_token': access_token, 'autocomplete': True}
        country = self.env['res.country'].with_context(lang='en_US').sudo().search([('name', '=', kw.get('force_country') or self.env.company.country_id.name)], limit=1)
        if country and country.code:
            params['country'] = country.code
        try:
            response = requests.get(url, params)
            result = json.loads(response.text)
        except Exception as e:
            self._raise_query_error(e)

        try:
            coordinates = result['features'][0]['geometry']['coordinates']
            return float(coordinates[1]), float(coordinates[0])
        except (KeyError, ValueError):
            _logger.debug('Unexpected mapbox API answer %s', result.get('message', ''))
            return None
