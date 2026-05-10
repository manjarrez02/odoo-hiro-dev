from odoo import models, fields, api

class ResGoogleApi(models.Model):
    _name = 'res.google.api'     
         
    @api.model
    def api_key_get(self):
        api_key = self.env['ir.config_parameter'].sudo().get_param('odoo-google-map-locator-v16.api_key')       
      
        return api_key