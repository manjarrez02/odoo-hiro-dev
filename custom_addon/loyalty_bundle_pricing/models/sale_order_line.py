# -*- coding: utf-8 -*-
from odoo import api, fields, models

class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    def write(self, vals):
        res = super().write(vals)
        # Sincronización reactiva si cambian cantidades o productos en líneas normales (NO de recompensa)
        normal_lines = self.filtered(lambda l: not l.is_reward_line)
        relevant_keys = {'product_uom_qty', 'product_id', 'price_unit', 'discount'}
        if normal_lines and relevant_keys.intersection(vals.keys()) and not self.env.context.get('skip_loyalty_update'):
            orders = normal_lines.mapped('order_id').filtered(lambda o: o.state in ('draft', 'sent'))
            for order in orders:
                if order.order_line.filtered('is_reward_line'):
                    order.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
                if 'product_uom_qty' in vals or 'product_id' in vals:
                    # Si aumentan las cantidades o cambian productos, permitir nueva evaluación
                    order.has_unapplied_promotions = order._check_unapplied_promotions()
        return res

    def unlink(self):
        normal_lines = self.filtered(lambda l: not l.is_reward_line)
        orders = normal_lines.mapped('order_id').filtered(lambda o: o.state in ('draft', 'sent'))
        has_reward_lines = any(o.order_line.filtered('is_reward_line') for o in orders)
        res = super().unlink()
        if normal_lines and has_reward_lines and not self.env.context.get('skip_loyalty_update'):
            for order in orders:
                order.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
                order.has_unapplied_promotions = order._check_unapplied_promotions()
        return res

    @api.onchange('product_uom_qty', 'product_id')
    def _onchange_quantity_sync_promotions(self):
        for line in self:
            if line.is_reward_line:
                continue
            order = line.order_id
            if not order or order.state not in ('draft', 'sent'):
                continue
            if order.order_line.filtered('is_reward_line') and order.id and not isinstance(order.id, models.NewId):
                order.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
            order.has_unapplied_promotions = order._check_unapplied_promotions()

    @api.depends('is_reward_line', 'reward_id.reward_type')
    def _compute_qty_to_invoice(self):
        super()._compute_qty_to_invoice()
        for line in self:
            if line.state in ('sale', 'done') and not line.display_type:
                if line.is_reward_line and (not line.reward_id or line.reward_id.reward_type != 'product' or line.product_id.type == 'service'):
                    # Las líneas de recompensa por descuento representan deducciones financieras / servicios.
                    # No son productos almacenables y nunca se entregan mediante albarán físico de almacén.
                    # Por tanto, su cantidad a facturar debe seguir siempre la cantidad ordenada menos lo ya facturado.
                    line.qty_to_invoice = line.product_uom_qty - line.qty_invoiced
