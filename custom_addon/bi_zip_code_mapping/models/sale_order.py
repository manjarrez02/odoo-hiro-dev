# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api

class SaleOrder(models.Model):
	_inherit = "sale.order"

	neighborhood_id = fields.Many2many('neighborhood.mapping', string='Neighborhood')
	neighborhood_text = fields.Char(string=" ",compute="compute_neighborhood_id")

	@api.onchange('partner_id')
	def onchange_partner_id(self):
		if self.partner_id.custom_zip:
			address = self.env['zip.code.mapping'].search([('name', '=', self.partner_id.custom_zip.name)])
			if address:
				self.neighborhood_id = self.partner_id.neighborhood_id

	@api.depends('neighborhood_id')
	def compute_neighborhood_id(self):
		for rec in self:
			if rec.neighborhood_id:
				rec.neighborhood_text = rec.neighborhood_id.name
			else:
				rec.neighborhood_text = False
				