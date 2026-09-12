from odoo import fields, models
from odoo import api, fields, models, _, Command
from odoo.exceptions import AccessError, UserError, ValidationError

class MyPosSession(models.Model):
    _inherit = 'pos.session'

    def _loader_params_res_partner(self):
        res = super(MyPosSession, self)._loader_params_res_partner()
        fields = res.get('search_params').get('fields')
        fields.extend(['neighborhood_id'])
        res['search_params']['fields'] = fields
        return res
    
    def _loader_params_res_company(self):
       res = super(MyPosSession, self)._loader_params_res_company()
       fields = res.get('search_params').get('fields')
       fields.extend(['street', 'city', 'zip'])
       res['search_params']['fields'] = fields
       return res

    def _loader_params_pos_payment_method(self):
        """Load payment method parameters"""
        result = super()._loader_params_pos_payment_method()
        result['search_params']['fields'].extend(['journal_id'])
        return result

    def _get_pos_invoice_payments(self):
        """Devuelve los account.payment en posted vinculados a esta sesión."""
        domain = [
            ('pos_session_id', 'in', self.ids),
            ('state', '=', 'posted'),
            '|',
            ('is_pos_invoice_payment', '=', True),
            ('pos_payment_method_id', '=', False),
        ]
        return self.env['account.payment'].search(domain)

    invoice_payment_count = fields.Integer(
        compute='_compute_invoice_payment_count',
        string='Invoice Payments Count'
    )

    def _compute_invoice_payment_count(self):
        for session in self:
            session.invoice_payment_count = len(session._get_pos_invoice_payments())

    def action_view_invoice_payments(self):
        self.ensure_one()
        payments = self._get_pos_invoice_payments()
        return {
            'name': _('Cobros de Facturas en POS'),
            'type': 'ir.actions.act_window',
            'res_model': 'account.payment',
            'view_mode': 'tree,form',
            'domain': [('id', 'in', payments.ids)],
            'context': {'default_pos_session_id': self.id},
        }

    @api.depends('payment_method_ids', 'order_ids', 'cash_register_balance_start')
    def _compute_cash_balance(self):
        super(MyPosSession, self)._compute_cash_balance()
        for session in self:
            cash_payment_method = session.payment_method_ids.filtered('is_cash_count')[:1]
            if cash_payment_method and cash_payment_method.journal_id:
                inv_cash_payments = session._get_pos_invoice_payments().filtered(
                    lambda p: p.journal_id == cash_payment_method.journal_id
                )
                total_inv_cash = sum(inv_cash_payments.mapped('amount'))
                session.cash_register_total_entry_encoding += total_inv_cash
                session.cash_register_balance_end += total_inv_cash
                session.cash_register_difference = session.cash_register_balance_end_real - session.cash_register_balance_end

    @api.depends('order_ids.payment_ids.amount')
    def _compute_total_payments_amount(self):
        super(MyPosSession, self)._compute_total_payments_amount()
        for session in self:
            inv_payments = session._get_pos_invoice_payments()
            session.total_payments_amount += sum(inv_payments.mapped('amount'))

# A continuación se define la forma de obtener la información al corte de los pagos a facturas en el POS

    def get_closing_control_data(self):
        if not self.env.user.has_group('point_of_sale.group_pos_user'):
            raise AccessError(_("You don't have the access rights to get the point of sale closing control data."))
        self.ensure_one()
        orders = self.order_ids.filtered(lambda o: o.state == 'paid' or o.state == 'invoiced')
        payments = orders.payment_ids.filtered(lambda p: p.payment_method_id.type != "pay_later")
        pay_later_payments = orders.payment_ids - payments
        cash_payment_method_ids = self.payment_method_ids.filtered(lambda pm: pm.type == 'cash')
        default_cash_payment_method_id = cash_payment_method_ids[0] if cash_payment_method_ids else None
        total_default_cash_payment_amount = sum(payments.filtered(lambda p: p.payment_method_id == default_cash_payment_method_id).mapped('amount')) if default_cash_payment_method_id else 0
        other_payment_method_ids = self.payment_method_ids - default_cash_payment_method_id if default_cash_payment_method_id else self.payment_method_ids
        cash_in_count = 0
        cash_out_count = 0
        cash_in_out_list = []
        last_session = self.search([('config_id', '=', self.config_id.id), ('id', '!=', self.id)], limit=1)
        for cash_move in self.sudo().statement_line_ids.sorted('create_date'):
            if cash_move.amount > 0:
                cash_in_count += 1
                name = f'Cash in {cash_in_count}'
            else:
                cash_out_count += 1
                name = f'Cash out {cash_out_count}'
            cash_in_out_list.append({
                'name': cash_move.payment_ref if cash_move.payment_ref else name,
                'amount': cash_move.amount
            })

        # Obtenemos los pagos de facturas para esta sesión
        invoice_payments = self._get_pos_invoice_payments()

        # Agrupamos los pagos de facturas por journal_id y calculamos el monto total para cada grupo
        invoice_payments_grouped_by_journal = {}
        for payment in invoice_payments:
            journal_id = payment.journal_id
            if journal_id in invoice_payments_grouped_by_journal:
                invoice_payments_grouped_by_journal[journal_id] += payment.amount
            else:
                invoice_payments_grouped_by_journal[journal_id] = payment.amount        

        cash_journal = default_cash_payment_method_id.journal_id if default_cash_payment_method_id else None
        total_inv_cash = invoice_payments_grouped_by_journal.get(cash_journal, 0.0) if cash_journal else 0.0

        return {
            'orders_details': {
                'quantity': len(orders),
                'amount': sum(orders.mapped('amount_total'))
            },
            'payments_amount': sum(payments.mapped('amount')) + sum(invoice_payments.mapped('amount')),
            'pay_later_amount': sum(pay_later_payments.mapped('amount')),
            'opening_notes': self.opening_notes,
            'default_cash_details': {
                'name': default_cash_payment_method_id.name,
                'amount': last_session.cash_register_balance_end_real
                          + total_default_cash_payment_amount
                          + total_inv_cash
                          + sum(self.sudo().statement_line_ids.mapped('amount')),
                'opening': last_session.cash_register_balance_end_real,
                'payment_amount': total_default_cash_payment_amount + total_inv_cash,
                'moves': cash_in_out_list,
                'id': default_cash_payment_method_id.id,
                'journal_name': default_cash_payment_method_id.journal_id.name,
                'journal_id': default_cash_payment_method_id.journal_id.id
            } if default_cash_payment_method_id else None,
            'other_payment_methods': [{
                'name': pm.name,
                'amount': sum(orders.payment_ids.filtered(lambda p: p.payment_method_id == pm).mapped('amount'))
                          + invoice_payments_grouped_by_journal.get(pm.journal_id, 0.0),
                'number': len(orders.payment_ids.filtered(lambda p: p.payment_method_id == pm))
                          + len(invoice_payments.filtered(lambda p: p.journal_id == pm.journal_id)),
                'id': pm.id,
                'type': pm.type,
                'journal_name': pm.journal_id.name,
                'journal_id': pm.journal_id.id
            } for pm in other_payment_method_ids],
            'invoice_payments_by_journal': [
                {
                    'journal_name': journal.name,
                    'journal_id': journal.id,
                    'amount': amount
                } for journal, amount in invoice_payments_grouped_by_journal.items()
            ],            
            'is_manager': self.user_has_groups("point_of_sale.group_pos_manager"),
            'amount_authorized_diff': self.config_id.amount_authorized_diff if self.config_id.set_maximum_difference else None
        }        
