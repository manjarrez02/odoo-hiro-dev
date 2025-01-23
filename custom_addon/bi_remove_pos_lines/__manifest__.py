# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    "name": "Quick POS Order Lines Remove/Delete",
    "version": "16.0.0.3",
    "category": "Point of Sales",
    'summary': 'POS remove order line pos delete order line delete pos order line delete pos line point of sale remove order line from pos order line delete fast remove pos order line pos fast remove order line delete from pos remove cart item pos delete item from pos',
    "description": """

        POS Remove Orderlines in odoo,
        POS-Point of Sale Fast Remove Order Line in Odoo
        Fast remove order line in odoo,
        Configuration for Fast Remove Order Line in odoo,
        Remove button for order line in odoo,
        Remove All button for order line in odoo,
        

    """,
    "author": "BrowseInfo",
    "website": "https://www.browseinfo.in",
    "price": 6,
    "currency": 'EUR',
    "depends": ['base', 'point_of_sale','pos_orders_all'],
    "data": [
        'views/pos_config_view_extended.xml',
    ],
    'qweb': [
    ],
    'assets': {
        'point_of_sale.assets': [
            'bi_remove_pos_lines/static/src/css/pos.css',
            'bi_remove_pos_lines/static/src/js/pos_fast_remove_orderline.js',
            'bi_remove_pos_lines/static/src/js/pos_remove_selected_orderline.js',
            'bi_remove_pos_lines/static/src/xml/**/*',
        ],
    },
    "auto_install": False,
    "installable": True,
    "live_test_url": 'https://youtu.be/i5FccnNeYpA',
    "images": ["static/description/Banner.gif"],
    'license': 'OPL-1'
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
