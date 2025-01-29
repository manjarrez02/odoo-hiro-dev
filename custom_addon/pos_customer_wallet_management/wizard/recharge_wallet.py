# -*- coding: utf-8 -*-
#############################################################################
#
#    Cybrosys Technologies Pvt. Ltd.
#
#    Copyright (C) 2024-TODAY Cybrosys Technologies(<https://www.cybrosys.com>)
#    Author: Sruthi Pavithran (odoo@cybrosys.com)
#
#    You can modify it under the terms of the GNU LESSER
#    GENERAL PUBLIC LICENSE (LGPL v3), Version 3.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU LESSER GENERAL PUBLIC LICENSE (LGPL v3) for more details.
#
#    You should have received a copy of the GNU LESSER GENERAL PUBLIC LICENSE
#    (LGPL v3) along with this program.
#    If not, see <http://www.gnu.org/licenses/>.
#
#############################################################################
from odoo import api, fields, models


class RechargeWallet(models.TransientModel):
    """Wallet recharge fields"""
    _name = "recharge.wallet"
    _description = "Create Wallet Recharge Of Each Customer"

    journal_id = fields.Many2one("account.journal", string="Payment Journal",
                                 help="Select journal type", domain=[("type", "in", ["cash", "bank"]), ("wallet_journal", "=", False)],
                                default=lambda self: self.env["account.journal"].search([("type", "=", "cash")], limit=1).id)
    recharge_amount = fields.Float(string="Recharge Amount",
                                   help="Recharge amount in wallet")

    def action_submit(self):
        """Create wallet recharge and wallet transaction"""
        partner = self.env['res.partner'].browse(
            self.env.context.get('active_id'))
        partner.write({
            'wallet_balance': partner.wallet_balance + self.recharge_amount})
        self.env['wallet.transaction'].create({
            'type': "Credit",
            'customer': partner.name,
            'amount': self.recharge_amount,
            'currency': partner.currency_id.name
        })
        pay_rec = self.env['account.payment'].create({
            'amount': self.recharge_amount,
            'ref': "Wallet Recharge",
            'payment_type': "inbound",
            'partner_id': partner.id,
            'journal_id': self.journal_id.id
        })
        pay_rec.action_post()
        move_vals = {
            'partner_id': partner.id,  # Cliente al que se le factura
            'move_type': 'out_invoice',  # Factura de cliente
            'invoice_date': fields.Date.today(),  # Fecha de la factura
            'invoice_line_ids': [(0, 0, {
                'name': 'Recarga de e-wallet',  # Etiqueta en la línea
                'quantity': 1,  # Cantidad fija
                'price_unit': self.recharge_amount,  # Monto del pago (ajusta según necesidad)                
            })]
        }
        
        invoice = self.env['account.move'].sudo().with_context(default_move_type=move_vals['move_type']).create(move_vals)
        invoice.action_post()
        # Reconciliar la factura con el pago
        receivable_account = self.env["res.partner"]._find_accounting_partner(partner).property_account_receivable_id

        if receivable_account.reconcile:
            # Obtener las líneas contables de la factura que no están reconciliadas
            invoice_receivables = invoice.line_ids.filtered(
                lambda line: line.account_id == receivable_account and not line.reconciled
            )

            if invoice_receivables:
                # Obtener las líneas de pago
                payment_receivables = pay_rec.move_id.line_ids.filtered(
                    lambda line: line.account_id == receivable_account and line.partner_id == partner
                )

                # Reconciliar las líneas de la factura y del pago
                (invoice_receivables | payment_receivables).sudo().reconcile()


    @api.model
    def frontend_recharge(self, partner, amount_input, currency):
        """Create functions for frontend wallet recharge"""
        self.env['wallet.transaction'].create({
            'type': "Credit",
            'customer': partner['name'],
            'amount': amount_input,
            'currency': currency
        })
        self.env['account.payment'].create({
            'amount': amount_input,
            'ref': "Wallet Recharge",
            'payment_type': "inbound",
            'partner_id': partner['id']
        })
        self.env['res.partner'].browse(partner['id']).write({
            'wallet_balance': partner['wallet_balance'] + int(amount_input)
        })
