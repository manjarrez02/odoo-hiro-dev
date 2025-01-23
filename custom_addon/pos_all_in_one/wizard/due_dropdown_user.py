# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, api, _

class ShowDueDropdownUser(models.TransientModel):
	_name = 'show.due.dropdown.user'
	_description = 'Show Due Dropdown User'

	user_id = fields.Many2one("res.users",'Allowed User',domain=[('allow_customer_limit_exceeded', '=', True)])

	def check_pin(self):
		if self.user_id:
			return {
				'name': _("Password"),
				'type': 'ir.actions.act_window',
				'view_mode': 'form',
				'res_model': 'user.due.pin',
				'target': 'new',
				'context': {**self.env.context, 'user_id': self.user_id[0].id, 'active_ids': self.ids, 'active_model': 'account.move'},
			}
