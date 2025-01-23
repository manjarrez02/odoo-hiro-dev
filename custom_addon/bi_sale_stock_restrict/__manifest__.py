# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    "name" : "Restrict Out of Stock Product on Sales Order",
    "version" : "16.0.0.0",
    "category" : "Sales",
    'summary': 'Out of stock product restriction on sales order restriction for out of stock product restriction for sales Restrict Out Stock Product Sales stop out of stock product for sale available products only out of stock product alerts out of stock products sales',
    "description": """
    
     This odoo app helps user to raise low stock warning on selecting product on sale order if the product out of stock. User also restrict out of stock product based on products on hand quantity or forecasted quantity and stock will checked and raise warning with stock description on confirming sale order for out of stock product.

User can restrict out of stock product based on on hand or foretasted quantity of product and also raise warning if product out of stock. User can only confirm sale order if product is in stock either stock restriction warning will raise and user can not confirm sale order. 
    
    """,
    "author": "BrowseInfo",
    'website': 'https://www.browseinfo.com',
    "price": 12,
    "currency": 'EUR',
    "depends" : ['base','sale_management','stock'],
    "data": [
        'views/res_config_settings.xml',
        'views/view_sale_order.xml',
    ],
    "auto_install": False,
    "installable": True,
    "live_test_url":'https://youtu.be/-izUQV_64sA',
    "images":["static/description/Banner.gif"],
    'license': 'OPL-1',
}

