import logging
from datetime import timedelta,date,datetime
from functools import partial

import psycopg2
import pytz

from odoo import api, fields, models, tools, _
from odoo.tools import float_is_zero
from odoo.exceptions import UserError
from odoo.http import request
from odoo.addons import decimal_precision as dp

_logger = logging.getLogger(__name__)

class OpenSessionReportCustom(models.AbstractModel):
    _inherit = 'report.pos_all_in_one.report_open_session'
	
    @api.model
    def get_sale_details(self,sessions=False):
        if sessions:
            orders = self.env['pos.order'].search([
                ('session_id.state','in', ['opened']),
                ('session_id', 'in', sessions.ids),
                ('state', 'in', ['invoiced', 'paid'])])
            
        if sessions:
            # Obtener todos los pagos relacionados con las sesiones especificadas
            invoice_payments = self.env['account.payment'].search([
                ('pos_session_id', 'in', sessions.ids),
                ('pos_payment_method_id', '=', None),   
                ('state', '=', 'posted')
            ])  

        # Crear un diccionario para almacenar las sumas por journal_id
        payments_by_journal = {}
        invoice_total = 0
        for payment in invoice_payments:
            invoice_payment_journal_id = payment.journal_id.id
            invoice_payment_journal_name = payment.journal_id.name
            amount = payment.amount
            invoice_total += amount
            # Sumar el monto al journal_id correspondiente en el diccionario
            if invoice_payment_journal_id in payments_by_journal:
                payments_by_journal[invoice_payment_journal_id]['total_amount'] += amount
            else:
                payments_by_journal[invoice_payment_journal_id] = {
                    'journal_name': invoice_payment_journal_name,
                    'total_amount': amount
                }

        user_currency = self.env.user.company_id.currency_id
        total = 0.0
        refund_total = 0.0
        products_sold = {}
        total_tax = 0.0
        taxes = {}
        mypro = {}
        products = []
        categories_data = {}
        total_discount = 0.0
        return_total =0.0
        categories_tot = []
        for order in orders:
            if user_currency != order.pricelist_id.currency_id:
                if order.amount_total >= 0:
                    total += order.pricelist_id.currency_id._convert(
                        order.amount_total, user_currency, order.company_id, order.date_order or fields.Date.today())
                else:
                    refund_total += order.pricelist_id.currency_id._convert(
                        order.amount_total, user_currency, order.company_id, order.date_order or fields.Date.today())
            else:
                if order.amount_total >= 0:
                    total += order.amount_total
                else:
                    refund_total += order.amount_total
            currency = order.session_id.currency_id

            total_tax = total_tax + order.amount_tax
            for line in order.payment_ids:
                if line.name:
                    if 'return' in line.name:
                        return_total+= abs(line.amount)

            for line in order.lines:
                total_discount +=line.qty * line.price_unit - line.price_subtotal

                category = line.product_id.pos_categ_id.name
                if category in categories_data:
                    old_subtotal = categories_data[category]['total']
                    categories_data[category].update({
                    'total' : old_subtotal+line.price_subtotal_incl,
                    })
                else:
                    categories_data.update({ category : {
                        'name' :category,
                        'total' : line.price_subtotal_incl,
                    }})
            categories_tot = list(categories_data.values())		
        st_line_ids = self.env["pos.payment"].search([('pos_order_id', 'in', orders.ids)]).ids
        payments = []
        refunds = []
        if st_line_ids:
            self.env.cr.execute("""
                SELECT COALESCE(ppm.name->>%s, ppm.name->>'en_US') e_name, sum(amount) total
                FROM pos_payment AS pp,
                    pos_payment_method AS ppm
                WHERE  pp.payment_method_id = ppm.id 
                    AND pp.id IN %s 
                    AND (
                        pp.amount > 0 
                        OR (pp.amount < 0 AND pp.name = 'regresar')
                    )
                GROUP BY ppm.name
            """, (self.env.lang,tuple(st_line_ids),))
            payments = self.env.cr.dictfetchall()
            self.env.cr.execute("""
                SELECT COALESCE(ppm.name->>%s, ppm.name->>'en_US') e_name, sum(amount) total
                FROM pos_payment AS pp,
                    pos_payment_method AS ppm
                WHERE  pp.payment_method_id = ppm.id 
                    AND pp.id IN %s 
                    AND (
                        (pp.amount < 0 AND pp.name IS NULL AND pp.payment_method_id = 1)
                        OR
                        (pp.amount < 0 AND pp.payment_method_id != 1)                        
                    )
                GROUP BY ppm.name
            """, (self.env.lang,tuple(st_line_ids),))
            refunds = self.env.cr.dictfetchall()

        sessions_name =[]
        opening_balance = 0.0
        for i in sessions:
            if i.cash_register_balance_start:
                opening_balance += i.cash_register_balance_start
            
            start_local = fields.Datetime.context_timestamp(self, i.start_at)
            session_info = f"{i.name} ({start_local.strftime('%d/%m/%Y %H:%M:%S')})"
            sessions_name.append(session_info)

        num_sessions = ', '.join(map(str,sessions_name) )

        return {
            'currency_precision': 2,
            'total_paid': user_currency.round(total),
            'total_refunded': user_currency.round(refund_total),
            'payments': payments,
            'refunds': refunds,
            'company_name': self.env.user.company_id.name,
            'taxes': float(total_tax),
            'num_sessions': num_sessions,		
            'categories_data':categories_tot,
            'total_discount' : total_discount,
            'print_date' : datetime.now(),
            'return_total':return_total,
            'opening_balance':opening_balance,
            'payments_by_journal' : payments_by_journal,
            'invoice_total' : invoice_total,
        }