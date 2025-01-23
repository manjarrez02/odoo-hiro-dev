# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, _
from datetime import date, datetime
from odoo.exceptions import ValidationError
import random
import pytz

class AccountMove(models.Model):
	_inherit = 'account.move'

	def check_due_amount(self,partner):
		now = fields.Datetime.now()
		account_move = self.env['account.move'].search([('partner_id', '=', partner['id']),('state', '=', 'posted'),('amount_residual', '>', 0),('invoice_date_due', '<', now)])
		due_amount_sum = sum(account_move.mapped('amount_residual'))
		return round(due_amount_sum, 2) 

class InheritSaleOrder(models.Model):
	_inherit = 'sale.order'

	is_match_pin = fields.Boolean('Pin Match')
	is_allow_limit = fields.Boolean('Allow Limit')
	cust_saleper_id = fields.Many2one('res.users', string='Manager for credit limit')
	cust_saleper_due_id = fields.Many2one('res.users', string='Manager for Balance Due')

	def action_confirm(self):
		for rec in self:
			if rec.partner_id:
				check_limit = rec.partner_id.limit_credit - rec.partner_id.bi_total_credit_amount
				if not self.is_match_pin:
					now = fields.Datetime.now()
					account_move = self.env['account.move'].search([('partner_id', '=', rec.partner_id.id),('state', '=', 'posted'),('amount_residual', '>', 0),('invoice_date_due', '<', now)])
					due_amount_sum = round(sum(account_move.mapped('amount_residual')),2)
					if due_amount_sum > 0:
						return {
							'name': _("Customer Due Amount"),
							'type': 'ir.actions.act_window',
							'view_mode': 'form',
							'res_model': 'warning.show.due.amount',
							'target': 'new',
							'context': {**self.env.context, 'active_ids': self.ids, 'active_model': 'account.move', 'sale_id':self.id},
						}
					else:
						if self.is_allow_limit:
							return super(InheritSaleOrder, self).action_confirm()
						else:
							if rec.partner_id.allow_over_limit and rec.tax_totals.get('amount_total') > check_limit:
								return {
									'name': _("It Allows To Make Payment"),
									'type': 'ir.actions.act_window',
									'view_mode': 'form',
									'res_model': 'warning.show.register',
									'target': 'new',
									'context': {**self.env.context, 'active_ids': self.ids, 'active_model': 'account.move', 'sale_id':self.id},
								}
				else:
					if self.is_allow_limit:
						return super(InheritSaleOrder, self).action_confirm()
					else:
						if rec.partner_id.allow_over_limit and rec.tax_totals.get('amount_total') > check_limit:
							return {
								'name': _("It Allows To Make Payment"),
								'type': 'ir.actions.act_window',
								'view_mode': 'form',
								'res_model': 'warning.show.register',
								'target': 'new',
								'context': {**self.env.context, 'active_ids': self.ids, 'active_model': 'account.move', 'sale_id':self.id},
							}
		res = super(InheritSaleOrder, self).action_confirm()
		return res


	def print_sale_order_receipt(self):
		orderlines = []

		for orderline in self.order_line:
			new_vals = {
				'id': orderline.id,
				'product_id': orderline.product_template_id.name,
				'price_subtotal' : orderline.price_subtotal,
				'qty': orderline.product_uom_qty,
				'price_unit': orderline.price_unit,
				}
				
			orderlines.append(new_vals)

		tz = pytz.timezone(self.user_id.tz or 'UTC')
		
		vals = {
			'orderlines': orderlines,
			'subtotal': self.amount_total - self.amount_tax,
			'user_name' : self.user_id.name,
			'date_order':self.date_order.now(tz=tz).strftime("%Y-%m-%d %H:%M:%S")
		}

		return vals

class InheritSaleOrderLine(models.Model):
	_inherit = 'sale.order.line'

	@api.onchange('product_id')
	def _onchange_product_id_warning(self):
		if not self.product_id:
			return

		product = self.product_id
		if self.product_id.allow_discount and self.order_id.partner_id.customer_discount > 0:
			self.discount = self.order_id.partner_id.customer_discount

		if product.sale_line_warn != 'no-message':
			if product.sale_line_warn == 'block':
				self.product_id = False

			return {
				'warning': {
					'title': _("Warning for %s", product.name),
					'message': product.sale_line_warn_msg,
				}
			}
