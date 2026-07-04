from odoo import api, fields, models


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    pricing_family_id = fields.Many2one(
        'product.pricing.family',
        string='Pricing Family',
        compute='_compute_pricing_family_id',
        store=False,
    )

    @api.depends('product_id.product_tmpl_id.pricing_family_id')
    def _compute_pricing_family_id(self):
        for line in self:
            line.pricing_family_id = line.product_template_id.pricing_family_id

    def _get_pricing_family_qty(self):
        self.ensure_one()
        family = self.product_template_id.pricing_family_id
        if not family or not self.order_id:
            return self.product_uom_qty or 0.0

        qty = 0.0
        seen = set()
        for line in self.order_id.order_line:
            if line.display_type or not line.product_id:
                continue
            if line.product_template_id.pricing_family_id != family:
                continue

            origin_id = line._origin.id if line._origin and line._origin.id else False
            key = origin_id or ('new', id(line))
            if key in seen:
                continue
            seen.add(key)
            qty += line.product_uom_qty or 0.0
        return qty

    @api.depends(
        'product_id',
        'product_uom',
        'product_uom_qty',
        'order_id.pricelist_id',
        'order_id.date_order',
        'order_id.order_line.product_uom_qty',
        'order_id.order_line.product_id',
        'order_id.order_line.product_template_id',
        'order_id.order_line.product_template_id.pricing_family_id',
    )
    def _compute_pricelist_item_id(self):
        for line in self:
            if not line.product_id or line.display_type or not line.order_id.pricelist_id:
                line.pricelist_item_id = False
                continue

            qty = (
                line._get_pricing_family_qty()
                if line.product_template_id.pricing_family_id
                else (line.product_uom_qty or 1.0)
            )
            line.pricelist_item_id = line.order_id.pricelist_id._get_product_rule(
                line.product_id,
                qty,
                uom=line.product_uom,
                date=line.order_id.date_order,
            )

    def _get_pricelist_price(self):
        self.ensure_one()
        self.product_id.ensure_one()

        pricelist_rule = self.pricelist_item_id
        order_date = self.order_id.date_order or fields.Date.today()
        product = self.product_id.with_context(**self._get_product_price_context())
        qty = (
            self._get_pricing_family_qty()
            if self.product_template_id.pricing_family_id
            else (self.product_uom_qty or 1.0)
        )
        uom = self.product_uom or self.product_id.uom_id
        currency = self.currency_id or self.order_id.company_id.currency_id

        if pricelist_rule:
            return pricelist_rule._compute_price(product, qty, uom, order_date, currency=currency)

        return product._get_tax_included_unit_price(
            self.company_id,
            currency,
            order_date,
            'sale',
            fiscal_position=self.order_id.fiscal_position_id,
            product_price_unit=product.list_price,
            product_currency=self.product_id.currency_id,
        )

    @api.onchange('product_uom_qty', 'product_id', 'product_uom')
    def _onchange_family_price_pending(self):
        for line in self:
            order = line.order_id
            if not order:
                continue
            order.has_pending_family_updates = order._needs_family_price_recompute()