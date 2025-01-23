# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from datetime import datetime,date
from odoo.exceptions import UserError, ValidationError


class AccountJournal(models.Model):
	_inherit = "account.journal"

	bi_sequence_id = fields.Many2one(comodel_name='ir.sequence',string="Entry Sequence", copy=False)
	bi_sequence_next_number = fields.Integer(string="Next Sequence Number", copy=False, default=1)
	bi_refund_sequence_id = fields.Many2one(comodel_name='ir.sequence',string="Credit Note Entry Sequence", copy=False)
	bi_refund_sequence_next_number = fields.Integer(string="Credit Note Next Number", copy=False ,default=1)

	def write(self,vals):
		res = super(AccountJournal, self).write(vals)
		if 'bi_sequence_next_number' in vals and self.type in ('sale', 'purchase'):
			for rec in self:
				if rec.bi_sequence_id:
					if rec.bi_sequence_id.use_date_range is True and len(rec.bi_sequence_id.date_range_ids) >=1:
						for i in rec.bi_sequence_id.date_range_ids:
							if i.date_from <= self.write_date.date() <= i.date_to:
								i.sudo().write({'number_next_actual': vals['bi_sequence_next_number']})
					else:
						rec.bi_sequence_id.sudo().write({'number_next_actual': vals['bi_sequence_next_number']})
		if 'bi_refund_sequence_next_number' in vals and self.type in ('sale', 'purchase'):
			for rec in self:
				if rec.bi_sequence_id:
					if rec.bi_refund_sequence_id.use_date_range is True and len(rec.bi_refund_sequence_id.date_range_ids) >=1:
						for i in rec.bi_refund_sequence_id.date_range_ids:
							if i.date_from <= self.write_date.date() <= i.date_to:
								i.sudo().write({'number_next_actual': vals['bi_refund_sequence_next_number']})
					else:
						rec.bi_refund_sequence_id.sudo().write({'number_next_actual': vals['bi_refund_sequence_next_number']})
		return res


class AccountMove(models.Model):
	_inherit = "account.move"

	is_draft = fields.Boolean(string='Is Draft',default=False)

	def button_draft(self):
		res = super(AccountMove,self).button_draft()
		self.is_draft = True
		return res
	
	@api.depends('posted_before', 'state', 'journal_id', 'date')
	def _compute_name(self):
		for rec in self:
			if rec.journal_id.type in ('sale','purchase') and rec.move_type in ('in_invoice','in_refund','out_invoice','out_refund') and self.name in (False, '/'):
				rec.name = '/'
			else:
				super(AccountMove, self)._compute_name()

	def write(self,vals):
		for order in self :
			if order.is_draft == False:
				if 'state' in vals:
					if vals['state'] in ('posted'):
						if order.journal_id.type in ('sale','purchase'):
							if order.move_type in ('out_invoice', 'in_invoice','out_receipt','in_receipt'):
								if not order.journal_id.bi_sequence_id:
									raise ValidationError('Add Sequence In Journal')
								else:
									seq = order.journal_id.bi_sequence_id._next()
									vals['name'] = seq
									order.journal_id.sudo().write({'bi_sequence_next_number':order.env['ir.sequence'].search([('id', '=', order.journal_id.bi_sequence_id.id)]).number_next_actual})
							elif order.move_type in ('out_refund', 'in_refund'):
								if not order.journal_id.bi_refund_sequence_id:
									raise ValidationError('Add Refund/Credit Note Sequence In Journal')
								else:
									seq = order.journal_id.bi_refund_sequence_id._next()
									vals['name'] = seq
									order.journal_id.sudo().write({'bi_refund_sequence_next_number':order.env['ir.sequence'].search([('id', '=', order.journal_id.bi_refund_sequence_id.id)]).number_next_actual})
					elif vals['state'] in ('draft','cancel'):
						if order.journal_id.type in ('sale','purchase'):
							for rec in order:
								order.name = rec.name

		return super(AccountMove, self).write(vals)
