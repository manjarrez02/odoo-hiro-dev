import requests

from odoo import fields, models, api, _
from odoo.http import request


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    mapbox_token = fields.Char(config_parameter='viin_web_map.mapbox_token', string='Mapbox Token',
                                help='Necessary for routing and styling in the viin_map view',
                                copy=True, default='', store=True)
    mapbox_token_invalid_warning = fields.Char(string='Invalid mapbox® Token Warning', compute='_compute_mapbox_token_invalid_warning')

    @api.depends('mapbox_token')
    def _compute_mapbox_token_invalid_warning(self):
        url_tmpl = 'https://api.mapbox.com/directions/v5/mapbox/driving/-73.989%2C40.733%3B-74%2C40.733?access_token={mapbox_token}&steps=true&geometries=geojson'
        for r in self:
            r.mapbox_token_invalid_warning = False
            if r.mapbox_token:
                try:
                    headers = {
                        'referer': request.httprequest.headers.environ.get('HTTP_REFERER')
                        }
                    result = requests.get(
                        url=url_tmpl.format(mapbox_token=r.mapbox_token),
                        headers=headers
                        )
                    error_code = result.status_code
                    if error_code == 401:
                        r.mapbox_token_invalid_warning = _('The token input is not valid')
                    elif error_code == 403:
                        r.mapbox_token_invalid_warning = _('This referrer is not authorized')
                    elif error_code == 500:
                        r.mapbox_token_invalid_warning = _('The mapbox® server is currently unreachable. Please try again later.')
                except Exception as e:
                    r.mapbox_token_invalid_warning = str(e)
