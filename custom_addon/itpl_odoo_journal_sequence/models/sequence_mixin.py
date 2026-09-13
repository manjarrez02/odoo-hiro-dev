# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError
from psycopg2 import DatabaseError
from odoo.tools.misc import format_date
from odoo.tools import mute_logger
from datetime import date, timedelta
from datetime import datetime
import re
from odoo.tools import (
    date_utils,
    email_re,
    email_split,
    float_compare,
    float_is_zero,
    float_repr,
    format_amount,
    format_date,
    formatLang,
    frozendict,
    get_lang,
    is_html_empty,
    sql
)


class SequenceMixin(models.AbstractModel):
    _inherit = 'sequence.mixin'

    @api.depends(lambda self: [self._sequence_field])
    def _compute_split_sequence(self):
        for record in self:
            sequence = record[record._sequence_field] or ''
            regex = re.sub(r"\?P<\w+>", "?:", record._sequence_fixed_regex.replace(r"?P<seq>", ""))
            matching = re.match(regex, sequence)
            if matching:
                record.sequence_prefix = sequence[:matching.start(1)]
                record.sequence_number = int(matching.group(1) or 0)
            else:
                record.sequence_prefix = False
                record.sequence_number = 0

            # Determinar si se debe usar credit_notes_entry_sequence_id o entry_sequence_id
            if record.move_type in ('out_invoice', 'in_invoice', 'entry'):
                sequence_obj = record.journal_id.sudo().entry_sequence_id
            elif record.move_type in ('out_refund', 'in_refund'):
                sequence_obj = record.journal_id.sudo().credit_notes_entry_sequence_id
            else:
                continue  # Si no es un tipo soportado, pasa al siguiente registro

            if not sequence_obj:
                continue

            # Verifica si ya se ha incrementado
            if record.id and record.id in sequence_obj.incremented_move_id.ids:
                continue
            if record._origin.id and record._origin.id in sequence_obj.incremented_move_id.ids:
                continue

            if record._origin.id and record.name and record.name != '/':
                sequence_obj.write({'incremented_move_id': [(4, record._origin.id)]})

                rec_date = fields.Date.to_date(record[record._sequence_date_field]) or fields.Date.context_today(record)
                if sequence_obj.use_date_range:
                    curr_seq = sequence_obj._get_current_sequence(sequence_date=rec_date)
                    if curr_seq and curr_seq != sequence_obj:
                        curr_seq.number_next_actual += sequence_obj.number_increment
                    else:
                        sequence_obj.number_next_actual += sequence_obj.number_increment
                else:
                    sequence_obj.number_next_actual += sequence_obj.number_increment


    @api.constrains(lambda self: (self._sequence_field, self._sequence_date_field))
    def _constrains_date_sequence(self):
        constraint_date = fields.Date.to_date(self.env['ir.config_parameter'].sudo().get_param(
            'sequence.mixin.constraint_start_date',
            '1970-01-01'
        ))
        for record in self:
            if not record._must_check_constrains_date_sequence():
                continue
            date = fields.Date.to_date(record[record._sequence_date_field])
            sequence = record[record._sequence_field]
            if not record.journal_id.sudo().entry_sequence_id:
                if (
                        sequence
                        and date
                        and date > constraint_date
                        and not record._sequence_matches_date()

                ):
                    raise ValidationError(_(
                        "The %(date_field)s (%(date)s) doesn't match the sequence number of the related %(model)s (%(sequence)s)\n"
                        "You will need to clear the %(model)s's %(sequence_field)s to proceed.\n"
                        "In doing so, you might want to resequence your entries in order to maintain a continuous date-based sequence.",
                        date=format_date(self.env, date),
                        sequence=sequence,
                        date_field=record._fields[record._sequence_date_field]._description_string(self.env),
                        sequence_field=record._fields[record._sequence_field]._description_string(self.env),
                        model=self.env['ir.model']._get(record._name).display_name,
                    ))

    def _get_sequence_format_param(self, previous):
        for record in self:
            if record.journal_id.sudo().entry_sequence_id:
                move_date = fields.Date.to_date(record[record._sequence_date_field]) or fields.Date.context_today(record)
                prefix1 = record.journal_id.sudo().entry_sequence_id._get_prefix_suffix(
                    date=move_date,
                    date_range=move_date,
                )
                prefix = prefix1[0]
                suffix_data = prefix1[1]
                prefix_refund = ''
                suffix_refund_data = ''
                if record.journal_id.sudo().credit_notes_entry_sequence_id:
                    prefix_refund1 = record.journal_id.sudo().credit_notes_entry_sequence_id._get_prefix_suffix(
                        date=move_date,
                        date_range=move_date,
                    )
                    prefix_refund = prefix_refund1[0]
                    suffix_refund_data = prefix_refund1[1]

                seq_model = (
                    record.journal_id.sudo().credit_notes_entry_sequence_id
                    if record.move_type in ('out_refund', 'in_refund')
                    else record.journal_id.sudo().entry_sequence_id
                )
                curr_seq = seq_model._get_current_sequence(sequence_date=move_date) if seq_model else False
                curr_next_num = curr_seq.number_next_actual if curr_seq else (record.journal_id.next_number or 1)

                if record.move_type in ('out_invoice', '0'):
                    previous = 'inv/0000'
                if record.move_type in ('in_invoice', '0'):
                    previous = 'bill/000'
                if record.move_type in ('out_refund', '0'):
                    previous = 'inv/0000'
                if record.move_type in ('in_refund', '0'):
                    previous = 'bill/000'
                if record.move_type in ('entry','0'):
                    previous = 'bank/000'
                sequence_number_reset = record._deduce_sequence_number_reset(previous)
                regex = record._sequence_fixed_regex
                if sequence_number_reset == 'year':
                    regex = record._sequence_yearly_regex
                elif sequence_number_reset == 'year_range':
                    regex = self._sequence_year_range_regex
                elif sequence_number_reset == 'month':
                    regex = record._sequence_monthly_regex
                format_values = re.match(regex, previous).groupdict()
                format_values['seq_length'] = len(format_values['seq'])
                format_values['year_length'] = len(format_values.get('year', ''))
                format_values['year_end_length'] = len(format_values.get('year_end') or '')
                if not format_values.get('seq') and 'prefix1' in format_values and 'suffix' in format_values:
                    format_values['prefix1'] = format_values['suffix']
                    format_values['suffix'] = ''
                for field in ('seq', 'year', 'month', 'year_end'):
                    format_values[field] = int(format_values.get(field) or 0)
                placeholders = re.findall(r'(prefix\d|seq|suffix\d?|year|year_end|month)', regex)

                if record.journal_id.sudo().entry_sequence_id and record.move_type in ('0', 'in_invoice'):
                    format_values.update({'seq': curr_next_num - 1,
                                          'seq_length': record.journal_id.sudo().entry_sequence_id.padding,
                                          'suffix': suffix_data,
                                          'prefix1': prefix,
                                          })

                if record.journal_id.sudo().credit_notes_entry_sequence_id and record.move_type in ('0', 'in_refund'):
                    format_values.update({'seq': curr_next_num - 1,
                                          'seq_length': record.journal_id.sudo().credit_notes_entry_sequence_id.padding,
                                          'suffix': suffix_refund_data,
                                          'prefix1': prefix_refund,
                                          })

                if record.journal_id.sudo().credit_notes_entry_sequence_id and record.move_type in ('0', 'out_refund'):
                    format_values.update({'seq': curr_next_num - 1,
                                          'seq_length': record.journal_id.sudo().credit_notes_entry_sequence_id.padding,
                                          'suffix': suffix_refund_data,
                                          'prefix1': prefix_refund,
                                          })

                if record.journal_id.sudo().entry_sequence_id and record.move_type in ('0', 'out_invoice'):
                    format_values.update({'seq': curr_next_num - 1,
                                          'seq_length': record.journal_id.sudo().entry_sequence_id.padding,
                                          'suffix': suffix_data,
                                          'prefix1': prefix,
                                          })
                if record.journal_id.sudo().entry_sequence_id and record.move_type in ('0', 'entry'):
                    format_values.update({'seq' : curr_next_num - 1,
                                          'seq_length': record.journal_id.sudo().entry_sequence_id.padding,
                                          'suffix': suffix_data,
                                          'prefix1': prefix})
                format = ''.join(
                    "{seq:0{seq_length}d}" if s == 'seq' else
                    "{month:02d}" if s == 'month' else
                    "{year:0{year_length}d}" if s == 'year' else
                    "{year_end:0{year_end_length}d}" if s == 'year_end' else
                    "{%s}" % s
                    for s in placeholders
                )


                return format, format_values
            else:
                sequence_number_reset = self._deduce_sequence_number_reset(previous)
                regex = self._sequence_fixed_regex
                if sequence_number_reset == 'year':
                    regex = self._sequence_yearly_regex
                elif sequence_number_reset == 'year_range':
                    regex = self._sequence_year_range_regex
                elif sequence_number_reset == 'month':
                    regex = self._sequence_monthly_regex

                format_values = re.match(regex, previous).groupdict()
                format_values['seq_length'] = len(format_values['seq'])
                format_values['year_length'] = len(format_values.get('year', ''))
                format_values['year_end_length'] = len(format_values.get('year_end') or '')
                if not format_values.get('seq') and 'prefix1' in format_values and 'suffix' in format_values:
                    # if we don't have a seq, consider we only have a prefix and not a suffix
                    format_values['prefix1'] = format_values['suffix']
                    format_values['suffix'] = ''
                for field in ('seq', 'year', 'month', 'year_end'):
                    format_values[field] = int(format_values.get(field) or 0)

                placeholders = re.findall(r'(prefix\d|seq|suffix\d?|year|year_end|month)', regex)
                format = ''.join(
                    "{seq:0{seq_length}d}" if s == 'seq' else
                    "{month:02d}" if s == 'month' else
                    "{year:0{year_length}d}" if s == 'year' else
                    "{year_end:0{year_end_length}d}" if s == 'year_end' else
                    "{%s}" % s
                    for s in placeholders
                )

                return format, format_values
    def _set_next_sequence(self):
        res = super(SequenceMixin, self)._set_next_sequence()
        # OVERRIDE
        if self.journal_id.sudo().entry_sequence_id:
            move_date = fields.Date.to_date(self[self._sequence_date_field]) or fields.Date.context_today(self)
            prefix1 = self.journal_id.sudo().entry_sequence_id._get_prefix_suffix(
                date=move_date, date_range=move_date
            )
            prefix = prefix1[0]
            suffix_data = prefix1[1]
            prefix_refund = ''
            suffix_refund_data = ''
            if self.journal_id.sudo().credit_notes_entry_sequence_id:
                prefix_refund_data = self.journal_id.sudo().credit_notes_entry_sequence_id._get_prefix_suffix(
                    date=move_date, date_range=move_date
                )
                prefix_refund = prefix_refund_data[0]
                suffix_refund_data = prefix_refund_data[1]

            self.ensure_one()
            last_sequence = self._get_last_sequence()

            new = not last_sequence
            if new:
                last_sequence = self._get_last_sequence(relaxed=True) or self._get_starting_sequence()
            format_string, format_values = self._get_sequence_format_param(last_sequence)
            sequence_number_reset = self._deduce_sequence_number_reset(last_sequence)
            if new:
                date_start, date_end = self._get_sequence_date_range(sequence_number_reset)
                seq_model = (
                    self.journal_id.sudo().credit_notes_entry_sequence_id
                    if self.move_type in ('out_refund', 'in_refund')
                    else self.journal_id.sudo().entry_sequence_id
                )
                curr_seq = seq_model._get_current_sequence(sequence_date=move_date) if seq_model else False
                curr_next_num = curr_seq.number_next_actual if curr_seq else (self.journal_id.next_number or 1)

                format_values['seq'] = curr_next_num
                if self.journal_id.entry_sequence_id and self.move_type in ('0', 'in_invoice'):
                    format_values.update({'seq': curr_next_num,
                                          'seq_length': self.journal_id.sudo().entry_sequence_id.padding,
                                          'suffix': suffix_data,
                                          'prefix1': prefix,
                                          })

                if self.journal_id.credit_notes_entry_sequence_id and self.move_type in ('0', 'in_refund'):
                    format_values.update({'seq': curr_next_num,
                                          'seq_length': self.journal_id.sudo().credit_notes_entry_sequence_id.padding,
                                          'suffix': suffix_refund_data,
                                          'prefix1': prefix_refund,
                                          })

                if self.journal_id.credit_notes_entry_sequence_id and self.move_type in ('0', 'out_refund'):
                    format_values.update({'seq': curr_next_num,
                                          'seq_length': self.journal_id.sudo().credit_notes_entry_sequence_id.padding,
                                          'suffix': suffix_refund_data,
                                          'prefix1': prefix_refund})

                if self.journal_id.entry_sequence_id and self.move_type in ('0', 'out_invoice'):
                    format_values.update({'seq': curr_next_num,
                                          'seq_length': self.journal_id.sudo().entry_sequence_id.padding,
                                          'suffix': suffix_data,
                                          'prefix1': prefix})

                if self.journal_id.entry_sequence_id and self.move_type in ('0', 'entry'):
                    format_values.update({'seq' : curr_next_num,
                                          'seq_length': self.journal_id.sudo().entry_sequence_id.padding,
                                          'suffix': suffix_data,
                                          'prefix1': prefix})

                format_values['month'] = move_date.month
                format_values['year_end'] = self._truncate_year_to_length(date_end.year, format_values['year_end_length'])

            if new:
                while True:
                    sequence = format_string.format(**format_values)
                    try:
                        with self.env.cr.savepoint(flush=False), mute_logger('odoo.sql_db'):
                            self[self._sequence_field] = sequence
                            self.flush_recordset([self._sequence_field])
                            break
                    except DatabaseError as e:
                        # 23P01 ExclusionViolation
                        # 23505 UniqueViolation
                        if e.pgcode not in ('23P01', '23505'):
                            raise e
                        format_values['seq'] = format_values['seq'] + 1
                self._compute_split_sequence()
                self.flush_recordset(['sequence_prefix', 'sequence_number'])
        return res
