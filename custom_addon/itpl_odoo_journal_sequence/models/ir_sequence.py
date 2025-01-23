# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError
import re
from datetime import date, timedelta

class SequenceMixin(models.AbstractModel):
    _inherit = 'ir.sequence'

    incremented_move_id = fields.Many2many('account.move', invisible=True)
