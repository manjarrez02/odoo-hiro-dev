from odoo import fields, models, api, _
from functools import partial
from datetime import date, datetime
import random
import pytz


class pos_order(models.Model):
	_inherit = 'pos.order'

	is_credit_sale = fields.Boolean(string="Venta a Crédito", default=False, readonly=True)
	max_credit_discount = fields.Monetary(
		string="Descuento Máximo Posible",
		currency_field='currency_id',
		compute='_compute_max_credit_discount',
		store=True,
		readonly=True,
		help="Descuento o bonificación potencial que el cliente puede obtener si liquida su crédito puntualmente."
	)

	@api.depends('is_credit_sale', 'partner_id.customer_discount', 'lines.price_subtotal_incl', 'lines.product_id.allow_discount')
	def _compute_max_credit_discount(self):
		for order in self:
			potential = 0.0
			if order.is_credit_sale and order.partner_id and order.partner_id.customer_discount > 0:
				disc_rate = order.partner_id.customer_discount / 100.0
				for line in order.lines:
					if getattr(line.product_id, 'allow_discount', False):
						potential += line.price_subtotal_incl * disc_rate
			order.max_credit_discount = potential

	@api.model
	def _order_fields(self, ui_order):
		order_fields = super(pos_order, self)._order_fields(ui_order)
		order_fields['is_credit_sale'] = ui_order.get('is_credit_sale', False)
		return order_fields
	
	def print_pos_receipt(self):
		
		orderlines = []
		paymentlines = []
		discount = 0

		for orderline in self.lines:
			
			new_vals = {
				'id': orderline.id,
				'product_id': orderline.product_id.name,
				'total_price' : orderline.price_subtotal_incl,
				'qty': orderline.qty,
				'price_unit': orderline.price_unit,
				'discount': orderline.discount,		
				'barcode': orderline.product_id.barcode,	
				}
				
			discount += (orderline.price_unit * orderline.qty * orderline.discount) / 100
			orderlines.append(new_vals)

		for payment in self.payment_ids:
			if payment.amount > 0:
				temp = {
					'amount': payment.amount,
					'name': payment.payment_method_id.name
				}
				paymentlines.append(temp)
		tz = pytz.timezone(self.user_id.tz or 'UTC')
		current_time = (datetime.now(tz)).strftime('%d-%m-%Y %H:%M:%S')

		potential_savings = self.max_credit_discount
		if not potential_savings and self.is_credit_sale and self.partner_id and self.partner_id.customer_discount > 0:
			disc_rate = self.partner_id.customer_discount / 100.0
			for orderline in self.lines:
				if getattr(orderline.product_id, 'allow_discount', False):
					potential_savings += orderline.price_subtotal_incl * disc_rate

		vals = {
			'discount': discount,
			'orderlines': orderlines,
			'paymentlines': paymentlines,
			'change': self.amount_return,
			'subtotal': self.amount_total - self.amount_tax,
			'tax': self.amount_tax,
			'barcode': self.barcode,
			'user_name' : self.user_id.name,
			'date_order':self.date_order.now(tz=tz).strftime("%d-%m-%Y %H:%M:%S"),
			'cust_saleper_id' : self.cust_saleper_id.name,
			'customer_street' : self.partner_id.street,
			'customer_neighborhood_id' : self.partner_id.neighborhood_id.name,
			'customer_city' : self.partner_id.city,
			'customer_state_id' : self.partner_id.state_id.name,
			'state' : self.state,
			'account_move' : self.account_move.name,
			'current_time' : current_time,
			'name' : self.name,
			'is_credit_sale': self.is_credit_sale,
			'potential_savings': potential_savings
		}
		
		return vals

	def _prepare_invoice_vals(self):
		vals = super(pos_order, self)._prepare_invoice_vals()
		# Sobrescribir el valor de invoice_user_id
		vals['invoice_user_id'] = self.cust_saleper_id.id
		return vals

