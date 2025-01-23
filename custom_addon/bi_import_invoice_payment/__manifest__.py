# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    "name": "Import Invoice with Payment | Import Customer Payment | Import Vendor Payment ",
    "version": "16.0.0.3",
    "category": "Accounting",
    'summary': 'Import paid Invoice Data import customer invoice paid invoice excel import vendor bills import paid invoices import validate invoice import invoice import invoice with payment import payment import customer payment import accounting import invoice data app',
    'description': """
     This odoo app helps user to import bulk invoices like customer invoice, customer credit note, vendor bill and refund with multiple lines. User also can import invoices with default or custom sequence, take account from product or file, import in draft state, auto validate with import and with payment, user also can import product by name, code and barcode. User can also import customer and supplier payments with draft state, auto validate with import and reconcile with invoice option. User have option to download sample file to import customer invoice and payments.
    """,
    "author": "BrowseInfo",
    "website": "https://www.browseinfo.com",
    "price": 19,
    "currency": 'EUR',
    "depends": ['base', 'account', 'account_payment'],
    "data": [
        'security/ir.model.access.csv',
        'security/security_group.xml',
        "data/attachment_sample.xml",
        'views/invoice_with_payment.xml',
        'views/customer_payment.xml'
    ],
    'qweb': [
    ],
    'license': 'OPL-1',
    "auto_install": False,
    "installable": True,
    "live_test_url": 'https://youtu.be/fRiiowdHmwQ',
    "images":['static/description/Banner.gif'],
}
