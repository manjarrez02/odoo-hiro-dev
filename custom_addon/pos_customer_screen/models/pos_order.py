# -*- coding: utf-8 -*-
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################
from odoo import api, fields, models


class PosOrder(models.Model):
    _inherit = "pos.order"

    def _order_fields(self, ui_order):
        res = super(PosOrder, self)._order_fields(ui_order)
        res.update({
            'rating': str(ui_order.get('rating')),
            'signature': ui_order.get('sign') or False
        })
        return res

    rating = fields.Selection(
        [('0', 'No Ratings'), ('1', 'Bad'), ('2', 'Not bad'), ('3', 'Good'), ('4', 'Very Good'), ('5', 'Excellent')],
        'Rating')
    signature = fields.Binary(string="Signature")

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
