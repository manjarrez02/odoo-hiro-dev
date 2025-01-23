# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError

class BiAccountPaymentRegister(models.TransientModel):
	_inherit = 'account.payment.register'  


	def action_create_payments(self):
		res = super(BiAccountPaymentRegister, self).action_create_payments()
		for rec in self:
			rec.partner_id.update_partner_credit_amount(rec.amount)
		return res
		
		
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:        
