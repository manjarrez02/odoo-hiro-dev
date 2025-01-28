from odoo import api, fields, models, _
from odoo.exceptions import UserError

class CustomAccountPaymentRegister(models.TransientModel):
    _inherit = 'account.payment.register'

    def action_create_payments(self):

        for rec in self:
            if rec.journal_id.wallet_journal:               
                partner = self.env['res.partner'].search([('id','=',rec.partner_id.id)])
                balance = round(partner.wallet_balance,2)        
                if balance < rec.amount:
                    raise UserError(_(
                    "Saldo de e-wallet insuficiente ($ %.2f)", balance 
                    ))            
            
        res = super(CustomAccountPaymentRegister, self).action_create_payments()

        for rec in self:  
            if rec.journal_id.wallet_journal:             
                partner = self.env['res.partner'].search([('id','=',rec.partner_id.id)])
                partner.write_value(balance, partner, rec.communication, rec.amount, rec.currency_id.name)

        return res