# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api


class PosConfig(models.Model):
    _inherit = 'pos.config'

    iface_fast_remove_orderline = fields.Boolean(string='Remove Order Line',
                                                 help='Allow To remove orderline')


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    iface_fast_remove_orderline = fields.Boolean(related='pos_config_id.iface_fast_remove_orderline',readonly=False)
   