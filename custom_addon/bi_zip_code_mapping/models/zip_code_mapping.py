# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api

class ZipCodeMapping(models.Model):
	_name = 'zip.code.mapping'
	_description = "Zip Code Mapping"

	name = fields.Char(string='Zip', required=True)
	city = fields.Char(string='City')
	state_id = fields.Many2one("res.country.state", string='State', domain="[('country_id', '=?', country_id)]")
	country_id = fields.Many2one('res.country', string='Country')
	neighborhood_ids = fields.Many2many('neighborhood.mapping', string='Neighborhood')

	@api.onchange('state_id')
	def _onchange_state(self):
		if self.state_id.country_id:
			self.country_id = self.state_id.country_id

	@api.onchange('country_id')
	def _onchange_country_id(self):
		if self.country_id and self.country_id != self.state_id.country_id:
			self.state_id = False