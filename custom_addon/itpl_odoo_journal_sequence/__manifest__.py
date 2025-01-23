# -*- coding: utf-8 -*-
# odoo 16
{
    'name': 'Journal Sequence for Odoo',
    'version': '1.0',
    'category': 'Accounting',

    'summary': 'Allows you to configure and change incoice/bill sequence directly from journals.',
    'description': """ 
            Using this module user can configure and change incoice/bill 
            sequence directly Odoo Journal Sequence, Odoo Journal Sequence, 
            Journal Sequence For Odoo, Journal Entry Sequence and Journal Sequence For Invoice """,    
    'license': 'OPL-1',
    'price': 9.00,
    'currency': 'USD',

    'author': "Icon TechSoft Pvt. Ltd.",
    'website': "https://icontechnology.co.in",
    'support': "team@icontechnology.in",
    'maintainer': "Icon TechSoft Pvt. Ltd.",
    
    'images': ['static/description/Odoo-Journal-Sequence-for-Odoo-gif-v16.gif'],
    'depends': ['account'],
    'data': [
        'views/account_journal_views.xml',
        'views/ir_sequence_views.xml'
    ],
    'auto_install': False,
    'installable': True,
}
