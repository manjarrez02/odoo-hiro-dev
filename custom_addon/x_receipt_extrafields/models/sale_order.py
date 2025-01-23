from odoo import fields, models, api, _
import pytz

class InheritSaleOrderExtra(models.Model):
    _inherit = 'sale.order'

    def print_sale_order_receipt(self):
        orderlines = []
        discount = 0

        for orderline in self.order_line:
            new_vals = {
				'id': orderline.id,
				'product_id': orderline.product_template_id.name,
				'price_subtotal' : orderline.price_subtotal,
				'qty': orderline.product_uom_qty,
				'price_unit': orderline.price_unit,
				'discount': orderline.discount,
                'barcode': orderline.product_id.barcode,
				}
            discount += (orderline.price_unit * orderline.product_uom_qty * orderline.discount) / 100
            orderlines.append(new_vals)

        tz = pytz.timezone(self.user_id.tz or 'UTC')
		
        vals = {
            'discount': discount,
			'orderlines': orderlines,
			'subtotal': self.amount_total - self.amount_tax,
			'user_name' : self.user_id.name,
			'date_order':self.date_order.now(tz=tz).strftime("%Y-%m-%d %H:%M:%S"),
			'customer_street' : self.partner_id.street,
			'customer_neighborhood_id' : self.partner_id.neighborhood_id.name,
			'customer_city' : self.partner_id.city,
			'customer_state_id' : self.partner_id.state_id.name,
            'cust_saleper_id' : self.cust_saleper_id.name,
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
		
	@api.depends('product_id', 'product_uom', 'product_uom_qty')
	def _compute_discount(self):
		for line in self:
			if not line.product_id or line.display_type:
				line.discount = 0.0

			if not (
                line.order_id.pricelist_id
                and line.order_id.pricelist_id.discount_policy == 'without_discount'
            ):
				continue

			line.discount = 0.0

			if line.product_id.allow_discount and line.order_id.partner_id.customer_discount > 0:
				line.discount = line.order_id.partner_id.customer_discount

			continue

			line._get_pricelist_price()

	@api.depends('product_id', 'product_uom', 'product_uom_qty')
	def _compute_price_unit(self):
		for line in self:
            # check if there is already invoiced amount. if so, the price shouldn't change as it might have been
            # manually edited
			if line.qty_invoiced > 0:
				continue
			if not line.product_uom or not line.product_id:
				line.price_unit = 0.0
			else:
				price = line.with_company(line.company_id)._get_display_price()
				line.price_unit = line.product_id._get_tax_included_unit_price(
                    line.company_id,
                    line.order_id.currency_id,
                    line.order_id.date_order,
                    'sale',
                    fiscal_position=line.order_id.fiscal_position_id,
                    product_price_unit=price,
                    product_currency=line.currency_id
                )
				if line._get_pricelist_price() :
					line.price_unit = line._get_pricelist_price()