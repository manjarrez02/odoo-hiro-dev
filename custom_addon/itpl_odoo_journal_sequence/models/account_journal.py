# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError
import re


class AccountJournal(models.Model):
    _inherit = 'account.journal'

    next_number = fields.Integer(string="Next Number",
                                 compute='_compute_seq_next_number',
                                 help='The next sequence number will be used for the next invoice.',
                                 readonly=False
                                 )
    credit_notes = fields.Integer(string="Credit Notes Next Number",
                                  compute='_compute_refund_seq_number_next',
                                  readonly=False
                                  )

    entry_sequence_id = fields.Many2one('ir.sequence', string="Entry Sequence")
    credit_notes_entry_sequence_id = fields.Many2one('ir.sequence', string="Credit Notes Entry Sequence")

    refund = fields.Boolean(default=True, invisible=True)


    @api.depends('entry_sequence_id.use_date_range', 'entry_sequence_id.number_next_actual')
    def _compute_seq_next_number(self):
        '''Compute 'sequence_number_next' according to the current sequence in use,
        an ir.sequence or an ir.sequence.date_range.
        '''
        for journal in self:
            if journal.sudo().entry_sequence_id:
                sequence = journal.sudo().entry_sequence_id._get_current_sequence()
                journal.next_number = sequence.number_next_actual
                journal.sudo().entry_sequence_id.number_next_actual = sequence.number_next_actual
            else:
                journal.next_number = 1

    @api.depends('credit_notes_entry_sequence_id.use_date_range', 'credit_notes_entry_sequence_id.number_next_actual')
    def _compute_refund_seq_number_next(self):
        '''Compute 'sequence_number_next' according to the current sequence in use,
        an ir.sequence or an ir.sequence.date_range.
        '''
        for journal in self:
            if journal.sudo().credit_notes_entry_sequence_id:
                sequence = journal.sudo().credit_notes_entry_sequence_id._get_current_sequence()
                journal.credit_notes = sequence.number_next_actual
                journal.sudo().credit_notes_entry_sequence_id.number_next_actual = sequence.number_next_actual
            else:
                journal.credit_notes = 1

    @api.model
    def _get_sequence_prefix(self, code, refund):
        prefix = code.upper()
        if refund:
            prefix = 'R' + code.upper()
        return prefix + '/%(range_year)s/'
    def create_sequence(self):
        prefix = self._get_sequence_prefix(self.code, 0)
        return_prefix = self._get_sequence_prefix(self.code, self.refund)
        seq = {
            'name': self.code +':' + ' Sequence',
            'prefix': prefix,
            'number_increment': 1,
            'use_date_range': True,
            'padding':3
        }
        r_seq = {
            'name': self.code +':'+ ' Refund Sequence',
            'prefix': return_prefix,
            'number_increment': 1,
            'use_date_range': True,
            'padding': 3
        }
        sequence_seq = self.env['ir.sequence'].create(seq)
        r_sequence_seq = self.env['ir.sequence'].create(r_seq)


        self.entry_sequence_id = sequence_seq
        self.credit_notes_entry_sequence_id = r_sequence_seq

    @api.model_create_multi
    def create(self, vals_list):
        for journal in vals_list:
            if journal.get('code') and journal.get('refund'):
                journal_code = journal.get('code')
                prefix = self._get_sequence_prefix(journal.get('code'), journal.get('0'))
                return_prefix = self._get_sequence_prefix(journal.get('code'), journal.get('refund'))
                seq = {
                    'name': journal_code + ':' + ' Sequence',
                    'prefix': prefix,
                    'use_date_range': True,
                    'padding': 3
                }
                r_seq = {
                    'name': journal_code + ':' + ' Refund Sequence',
                    'prefix': return_prefix,
                    'use_date_range': True,
                    'padding': 3
                }
                sequence_seq = self.env['ir.sequence'].create(seq)
                r_sequence_seq = self.env['ir.sequence'].create(r_seq)
                journal.update({'entry_sequence_id' : sequence_seq.id, 'credit_notes_entry_sequence_id' : r_sequence_seq.id})
            return super(AccountJournal, self).create(vals_list)


