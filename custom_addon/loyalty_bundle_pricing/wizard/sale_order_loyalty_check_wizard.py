# -*- coding: utf-8 -*-
from odoo import fields, models, _

class SaleOrderLoyaltyCheckWizard(models.TransientModel):
    _name = 'sale.order.loyalty.check.wizard'
    _description = 'Verificar promociones disponibles antes de confirmar'

    sale_order_id = fields.Many2one('sale.order', required=True, readonly=True)

    def action_apply_and_confirm(self):
        self.ensure_one()
        order = self.sale_order_id
        order.action_apply_pending_promotions()
        return order.with_context(skip_loyalty_check=True, skip_loyalty_update=True).action_confirm()

    def action_confirm_without_apply(self):
        self.ensure_one()
        order = self.sale_order_id
        order.action_dismiss_pending_promotions()
        return order.with_context(skip_loyalty_check=True, skip_loyalty_update=True).action_confirm()
