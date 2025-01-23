# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.
from odoo import Command, models, fields, api, _
from odoo.exceptions import UserError


class UserDuePin(models.TransientModel):
	_name = 'user.due.pin'
	_description = 'User Due Pin'

	user_pin = fields.Char('Pin')

	def check_user_pin(self):
		user = self.env['res.users'].browse({self.env.context.get('user_id')})
		if user:
			if user.add_pin != self.user_pin:
				raise UserError(_("Wrong Pin"))
			else:
				sale_id = False
				if self.env.context.get('sale_id'):
					sale_id = self.env['sale.order'].browse({self.env.context.get('sale_id')})
				if sale_id:   
					sale_id.is_match_pin = True
					sale_id.sudo().write({'cust_saleper_due_id': user.id})
					return sale_id.action_confirm()
					