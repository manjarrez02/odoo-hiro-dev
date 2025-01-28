# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.tools import float_is_zero
from odoo.exceptions import UserError

class CustomPosMakePayment(models.TransientModel):

    _inherit = 'pos.make.payment'

    def check(self):
        """Check the order:
        if the order is not paid: continue payment,
        if the order is paid print ticket.
        """
        self.ensure_one()

        order = self.env['pos.order'].browse(self.env.context.get('active_id', False))
        if self.payment_method_id.split_transactions and not order.partner_id:
            raise UserError(_(
                "Customer is required for %s payment method.",
                self.payment_method_id.name
            ))

        currency = order.currency_id

        init_data = self.read()[0]
        if not float_is_zero(init_data['amount'], precision_rounding=currency.rounding):
            if self.payment_method_id.wallet_journal:
                partner = self.env['res.partner'].search([('id','=',order.partner_id.id)])
                balance = round(partner.wallet_balance,2)
                amount = round(init_data['amount'],2)
                current_session = order.name
                if balance >= amount:
                    partner.write_value(balance, partner, current_session, amount, currency.name)
                else:
                    raise UserError(_(
                    "Saldo de e-wallet insuficiente ($ %.2f)", balance 
                    ))
            order.add_payment({
                'pos_order_id': order.id,
                'amount': order._get_rounded_amount(init_data['amount']),
                'name': init_data['payment_name'],
                'payment_method_id': init_data['payment_method_id'][0],
            })

        if order._is_pos_order_paid():
            order.action_pos_order_paid()
            order._create_order_picking()
            order._compute_total_cost_in_real_time()
            return {'type': 'ir.actions.act_window_close'}

        return self.launch_payment()