# -*- coding: utf-8 -*-
from odoo import models, fields


class ResUsers(models.Model):
    _inherit = 'res.users'

    show_report_preview = fields.Boolean('Reports Preview', default=True, help="Check to open report on modal window")
