from odoo import fields, models


class SaleOrderFamilyUpdateWizard(models.TransientModel):
    _name = 'sale.order.family.update.wizard'
    _description = 'Confirm pending family price updates'

    sale_order_id = fields.Many2one('sale.order', required=True, readonly=True)

    def action_apply_and_confirm(self):
        self.ensure_one()
        order = self.sale_order_id
        order.action_recompute_family_prices()
        return super(type(order), order).action_confirm()

    def action_confirm_without_apply(self):
        self.ensure_one()
        order = self.sale_order_id
        order.action_clear_pending_family_updates()
        return super(type(order), order).action_confirm()