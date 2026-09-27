# -*- coding: utf-8 -*-
from odoo import models

class PosSession(models.Model):
    _inherit = 'pos.session'

    def _loader_params_loyalty_program(self):
        res = super()._loader_params_loyalty_program()
        fields = res.get('search_params', {}).get('fields', [])
        for f in ['pricelist_ids', 'is_exclusive', 'sequence']:
            if f not in fields:
                fields.append(f)
        return res

    def _loader_params_loyalty_reward(self):
        res = super()._loader_params_loyalty_reward()
        fields = res.get('search_params', {}).get('fields', [])
        for f in ['bundle_qty', 'bundle_price', 'bundle_pricing_mode', 'free_qty', 'trigger_product_ids', 'discount_product_ids', 'prevent_below_cost', 'min_margin_pc']:
            if f not in fields:
                fields.append(f)
        return res
