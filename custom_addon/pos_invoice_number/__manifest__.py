# -*- coding: utf-8 -*-

{
    'name': 'POS Invoice Number',
    'category': 'Point of Sale',
    'summary': 'POS Invoice Number, Print POS Invoice Number, POS Order Receipt, POS Order Invoice,Print POS Order Invoice, Order Invoice on Receipt, Print Order Invoice on Receipt,Point of sale Order Invoice In Receipt with order Invoice on pos receipt order Invoice print order Invoice Number, show invoice number on pos receipt, Invoice on Receipt, Invoive Number on POS Receipt, POS Invoice Receipt, Invoice number in pos ticket',
    'description': """Print Invoice Number on Receipt""",
    'depends': ['point_of_sale'],
    'author': "Khaled Hassan",
    'website': "https://apps.odoo.com/apps/modules/browse?search=Khaled+hassan",
    'data': [
       
    ],
    'version': '16.0',
    'license': 'OPL-1',
    'currency': 'EUR',
    'price': '5',
    'images': ['static/description/main_screenshot.png'],
    'installable': True,
    'auto_install': False,
    'application': False,
    'assets': {
        'point_of_sale.assets': [
            "pos_invoice_number/static/src/js/order_number.js",
        ],
    },
}
