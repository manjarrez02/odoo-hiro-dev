# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.
from odoo import Command, models, fields, api, _

class WarningShowPayment(models.TransientModel):
	_name = 'warning.show.register'
	_description = 'Warning Show Register'

	text_custom = fields.Char("Test")

	def show_dropdown_uses_list(self):
		return {
			'name': _("List Of Users"),
			'type': 'ir.actions.act_window',
			'view_mode': 'form',
			'res_model': 'show.dropdown.user',
			'target': 'new',
			'context': {**self.env.context, 'active_ids': self.ids, 'active_model': 'account.move'},
		}
