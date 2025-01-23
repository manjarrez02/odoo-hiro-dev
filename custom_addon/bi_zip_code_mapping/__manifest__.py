# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    "name": "ZIP Code Mapping",
    "version": "16.0.0.2",
    "category": "Contact",
    'summary': 'ZIP Code Mapping',
    "description": """
        ZIP Code Mapping
    """,
    "author": "BrowseInfo",
    "website": "https://www.browseinfo.in",
    "price": 0,
    "currency": 'EUR',
    "depends": ['base','sale_management'],
    "data": [
        'security/ir.model.access.csv',
        'views/res_partner_view.xml',
        'views/neighborhood_mapping_view.xml',
        'views/zip_code_mapping_view.xml',
#        'views/sale_order_view.xml',
        'views/account_move_view.xml',
    ],
    "auto_install": False,
    "installable": True,
    "live_test_url": 'https://youtu.be/i5FccnNeYpA',
    "images": ["static/description/Banner.gif"],
    'license': 'OPL-1'
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
