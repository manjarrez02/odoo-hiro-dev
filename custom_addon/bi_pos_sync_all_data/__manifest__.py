# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    "name" : "Automatic POS All Data Sync",
    "version" : "16.0.0.4",
    "category" : "Point of Sale",
    'summary': 'Auto Product Sync on POS Screen automatic data Sync on POS All In One Auto Sync Data Automatic POS All Data Sync automatic pos data synchronization auto pos data synchronization pos all data sync auto pos data sync auto product stock sync on pos screen',
    "description": """ 
    
     This odoo app helps user to automatically sync all pos data like new added customers, updated customers, new added products, and product details like name, price, and stock to all running point of sale session without refresh or reload.

After creating or updating new customers or products in point of sale backend, user need to restart and relaod point of sale session every time and its headache, But now using this odoo app user can forgot to restart pos session as all point of sale data will automatically sync to all pos session, when user create a new customer or update an existing customer, create a new product or update an existing product details like name, price, and stock then it will automatically sync and updated to all point of session, and user no need to refresh page or restart pos session.

    """,
    "author": "BrowseInfo",
    "website" : "https://www.browseinfo.com",
    "price": 75,
    "currency": 'EUR',
    "depends" : ['base','sale_management','stock','account','point_of_sale'],
    "data": [
        "views/custom_pos_view.xml",
    ],

    'assets': {
        'point_of_sale.assets': [
            "bi_pos_sync_all_data/static/src/css/stock.css",
#            "bi_pos_sync_all_data/static/src/js/ProductScreen.js",
#            "bi_pos_sync_all_data/static/src/js/ProductsWidget.js",
            "bi_pos_sync_all_data/static/src/js/PartnerListScreen.js",
            "bi_pos_sync_all_data/static/src/js/TicketScreen.js",
#            'bi_pos_sync_all_data/static/src/xml/pos.xml',
        ],
     },

    'license': 'OPL-1',
    "auto_install": False,
    "installable": True,
    "live_test_url":'https://youtu.be/1Us1rHIGLsI',
    "images":['static/description/Banner.gif'],
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
