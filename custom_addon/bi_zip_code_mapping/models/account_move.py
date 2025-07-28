# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api
from odoo.exceptions import UserError

class AccountMove(models.Model):
	_inherit = "account.move"

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

	def action_post(self):
		res = super(AccountMove, self).action_post()
		for move in self:
			if move.move_type == 'out_invoice' and move.invoice_origin:
				sale_order_id = self.env['sale.order'].search([('name', '=', move['invoice_origin'])], limit=1)
				move.update({
					'neighborhood_id': sale_order_id.neighborhood_id,
					'neighborhood_text': sale_order_id.neighborhood_text
				})
		return res

class SaleAdvancePaymentInv_inherit(models.TransientModel):
	_inherit = "sale.advance.payment.inv"

	def _create_invoices(self, sale_orders):
		res = super(SaleAdvancePaymentInv_inherit, self)._create_invoices(sale_orders)
		partner_ids = sale_orders.mapped('partner_id')
		if len(partner_ids) == 1:
			res ['neighborhood_id'] = sale_orders[0].neighborhood_id
			res['neighborhood_text'] = sale_orders[0].neighborhood_text
		else:
			raise UserError("Todas las órdenes deben pertenecer al mismo contacto para generar una factura.")
		return res
