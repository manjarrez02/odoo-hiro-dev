# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    
    stock_restriction = fields.Boolean(string="Out Of Stock Product Restriction? ",related="company_id.stock_restriction",readonly=False)
    stock_check_type = fields.Selection(related="company_id.stock_check_type",readonly=False)
    low_stock = fields.Boolean(string="Low Stock Warning?",related="company_id.low_stock",readonly=False)
    
class Company(models.Model):
    _inherit = 'res.company'
    
    stock_restriction = fields.Boolean(string="Out Of Stock Product Restriction ")
    stock_check_type = fields.Selection(
        [('on_hand', 'On Basis of On Hand Quantity'), ('forecasted', 'On Basis of Forecasted Quantity'),
        ], 'Check Stock')
    low_stock = fields.Boolean(string="Low Stock Warning?")
    