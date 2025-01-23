# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api
import json


class ResPartner(models.Model):
	_inherit = 'res.partner'

	custom_zip = fields.Many2one('zip.code.mapping')
	neighborhood_id = fields.Many2one('neighborhood.mapping', string='Neighborhood')
	neighborhood_ids = fields.Many2many('neighborhood.mapping', string='Neighborhoods', compute="_compute_user_domain")

	@api.depends('custom_zip')
	def _compute_user_domain(self):
		for rec in self:
			rec.update({
				'neighborhood_ids' : [],
			})
			address = self.env['zip.code.mapping'].search([('name', '=', rec.custom_zip.name)])
			if rec.custom_zip and address.neighborhood_ids:
				rec.city = address.city
				rec.state_id = address.state_id.id
				rec.country_id = address.country_id.id
				rec.zip = address.name
				rec.neighborhood_ids = address.neighborhood_ids.ids
				if rec.neighborhood_id not in address.neighborhood_ids:
					rec.neighborhood_id = []
			else:
				rec.neighborhood_ids = []
				rec.neighborhood_id = []

	@api.model
	def _get_address_format(self):
		address_components = []

        # Agregamos cada campo si está disponible
		if self.street:
			address_components.append(self.street)
		if self.neighborhood_id and self.neighborhood_id.name:
			address_components.append(self.neighborhood_id.name)
		if self.city:
			address_components.append(self.city)
		if self.state_id and self.state_id.name:
			address_components.append(self.state_id.name)

        # Unimos los componentes con comas
		return ', '.join(address_components)