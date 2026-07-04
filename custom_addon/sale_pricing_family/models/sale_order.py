from odoo import api, fields, models, _


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    has_pending_family_updates = fields.Boolean(
        string="Pending Family Price Updates",
        default=False,
    )

    @api.onchange('order_line')
    def _onchange_order_line_pending_family_updates(self):
        for order in self:
            order.has_pending_family_updates = order._needs_family_price_recompute()

    def _needs_family_price_recompute(self):
        self.ensure_one()
        family_counts = {}
        for line in self.order_line:
            if line.display_type or not line.product_id:
                continue
            family = line.product_template_id.pricing_family_id
            if not family:
                continue
            family_counts[family.id] = family_counts.get(family.id, 0) + 1
        return any(count > 1 for count in family_counts.values())

    def _recompute_family_prices(self, families=None):
        for order in self:
            lines = order.order_line.filtered(lambda l: not l.display_type and l.product_id)
            if families:
                lines = lines.filtered(lambda l: l.product_template_id.pricing_family_id in families)
            if not lines:
                continue

            lines_ctx = lines.with_context(skip_family_price_recompute=True)
            lines_ctx._compute_pricelist_item_id()
            for line in lines_ctx:
                line.price_unit = line._get_pricelist_price()

    def action_recompute_family_prices(self):
        self.ensure_one()
        self._recompute_family_prices(families=None)
        self.has_pending_family_updates = False
        return True

    def action_clear_pending_family_updates(self):
        self.ensure_one()
        self.has_pending_family_updates = False
        return True

    def action_confirm(self):
        self.ensure_one()
        if self.has_pending_family_updates:
            return {
                'name': _('Cambios pendientes en precios por familia'),
                'type': 'ir.actions.act_window',
                'res_model': 'sale.order.family.update.wizard',
                'view_mode': 'form',
                'target': 'new',
                'context': {
                    'default_sale_order_id': self.id,
                },
            }
        return super().action_confirm()