# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.
from odoo import Command, models, fields, api, _

class WarningShowDueAmount(models.TransientModel):
	_name = 'warning.show.due.amount'
	_description = 'Warning Show Due Amount'

	text_custom = fields.Char("Test")

	def show_dropdown_uses_list(self):
		return {
			'name': _("List Of Users"),
			'type': 'ir.actions.act_window',
			'view_mode': 'form',
			'res_model': 'show.due.dropdown.user',
			'target': 'new',
			'context': {**self.env.context, 'active_ids': self.ids, 'active_model': 'account.move'},
		}
