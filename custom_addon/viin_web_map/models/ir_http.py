from odoo import models


class IrHttp(models.AbstractModel):
    _inherit = 'ir.http'

    def session_info(self):
        """
        Add mapbox® token to http session for usage in js client
        """
        session = super(IrHttp, self).session_info()
        config_parameter_sudo = self.env['ir.config_parameter'].sudo()
        geo_provider = self.env['base.geocoder'].sudo()._get_provider().tech_name
        session.update(
            geo_provider=geo_provider
            )
        if self.env.user.has_group('base.group_user'):
            session.update(
                google_map_api_key=config_parameter_sudo.get_param('base_geolocalize.google_map_api_key', False),
                mapbox_token=config_parameter_sudo.get_param('viin_web_map.mapbox_token', False)
                )
        return session
