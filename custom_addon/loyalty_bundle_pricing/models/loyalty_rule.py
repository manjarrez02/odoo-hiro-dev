# -*- coding: utf-8 -*-
from odoo import api, fields, models

class LoyaltyRule(models.Model):
    _inherit = 'loyalty.rule'

    def init(self):
        super().init()
        # Asegurar que todas las reglas de tipo bundle_pricing tengan modo unitario
        self.env.cr.execute("""
            UPDATE loyalty_rule lr
            SET reward_point_mode = 'unit',
                reward_point_amount = 1
            FROM loyalty_program lp
            WHERE lr.program_id = lp.id
              AND lp.program_type = 'bundle_pricing'
              AND (lr.reward_point_mode != 'unit' OR lr.reward_point_amount != 1)
        """)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            program_id = vals.get('program_id')
            if program_id:
                program = self.env['loyalty.program'].browse(program_id)
                if program.program_type == 'bundle_pricing':
                    vals.setdefault('reward_point_mode', 'unit')
                    vals.setdefault('reward_point_amount', 1)
        return super().create(vals_list)

    def write(self, vals):
        for rule in self:
            if rule.program_id.program_type == 'bundle_pricing':
                if 'reward_point_mode' in vals and not vals['reward_point_mode']:
                    vals['reward_point_mode'] = 'unit'
        return super().write(vals)

    def _get_valid_product_domain(self):
        domain = super()._get_valid_product_domain()
        # Si es bundle_pricing y la regla no tiene filtros específicos de producto o categoría,
        # sincronizar automáticamente con los productos/categorías definidos en la recompensa
        if self.program_id.program_type == 'bundle_pricing' and not domain:
            reward = self.program_id.reward_ids[:1]
            if reward and reward.discount_applicability == 'specific':
                reward_domain = reward._get_discount_product_domain()
                if reward_domain:
                    return reward_domain
        return domain
