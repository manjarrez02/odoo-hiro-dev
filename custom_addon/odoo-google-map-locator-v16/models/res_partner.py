from odoo import models, fields, api

class ResPartner(models.Model):
    _inherit = 'res.partner'   

    map_address = fields.Char(string='Map Address')
    state_label = fields.Char(string='State Label')
    country_label = fields.Char(string='Country Label')
    latitude = fields.Char(string='Latitude')
    longitude = fields.Char(string='Longitude')
    date_localization = fields.Date(string='Geolocation Date')
    
    @api.model
    def get_country_state_ids(self, country_name, state_name):
        country_id = self.env['res.country'].search([('name', '=', country_name)], limit=1)
        state_id = self.env['res.country.state'].search([('name', '=', state_name), ('country_id', '=', country_id.id)], limit=1)
        return {
            'country_id': country_id.id if country_id else False,
            'state_id': state_id.id if state_id else False,
        }
    
    @api.model
    def create(self, vals):
        # Modify the field value before saving
        if 'country_label' in vals:
            country_id = self.env['res.country'].search([('name', '=', vals['country_label'])], limit=1)
            if country_id:
                vals['country_id'] = country_id.id
            else:
                vals['country_id'] = False           

        if 'state_label' in vals:
            state_id = self.env['res.country.state'].search([('name', '=', vals['state_label'])], limit=1)
            if state_id:
                vals['state_id'] = state_id.id
            else:
                vals['state_id'] = False          
        
        result = super(ResPartner, self).create(vals)       

        # Ensure the transaction is committed if necessary
        self.env.cr.commit()

        return result

    def write(self, vals):
        vals = dict(vals)

        if 'country_label' in vals:
            country_id = self.env['res.country'].search([('name', '=', vals['country_label'])], limit=1)
            vals['country_id'] = country_id.id if country_id else False

        if 'state_label' in vals:
            state_id = self.env['res.country.state'].search([('name', '=', vals['state_label'])], limit=1)
            vals['state_id'] = state_id.id if state_id else False

        address_fields = ['street', 'zip', 'city', 'state_id', 'country_id']
        address_changed = any(field in vals for field in address_fields)
        has_geo_vals = 'partner_latitude' in vals and 'partner_longitude' in vals

        if address_changed and not has_geo_vals and len(self) == 1:
            if self.partner_latitude and self.partner_longitude:
                vals['partner_latitude'] = self.partner_latitude
                vals['partner_longitude'] = self.partner_longitude

        return super().write(vals)