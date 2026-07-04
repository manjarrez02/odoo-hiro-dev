{
    'name': 'Sale Pricing Family',
    'version': '16.0.1.0.0',
    'summary': 'Accumulate quantities by pricing family in Sales pricelist calculation',
    'category': 'Sales/Sales',
    'author': 'Perplexity',
    'license': 'LGPL-3',
    'depends': ['sale_management', 'product', 'web', 'x_pos_custom_view'],
    'data': [
        'security/ir.model.access.csv',
        'views/product_pricing_family_views.xml',
        'views/product_template_views.xml',
        'views/sale_order_views.xml',
        'views/sale_order_family_update_wizard_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'sale_pricing_family/static/src/js/sale_order_save_confirm.js',
            'sale_pricing_family/static/src/js/family_qty_field.js',
        ],
        'point_of_sale.assets': [
            'sale_pricing_family/static/src/js/pricing_family_order.js',
            'sale_pricing_family/static/src/js/pricing_family_orderline.js',
            'sale_pricing_family/static/src/js/add_product.js',
        ],
    },
    'installable': True,
    'application': False,
}
