# -*- coding: utf-8 -*-
# Part of Softhealer Technologies.

from odoo import models, fields


class PosConfig(models.Model):
    _inherit = "pos.config"

    sh_is_quick_receipt_print = fields.Boolean(string="Print Quick Receipt")
