# -*- coding: utf-8 -*-
{
    'name': 'Loyalty Bundle Pricing (Compra X por $Y)',
    'version': '16.0.1.0.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Promociones por paquetes cerrados y múltiplos (ej. 3 por $50) en Ventas y TPV con soporte de listas de precios',
    'description': """
Módulo de Promociones por Bloques / Paquetes (Compra X por $Y)
=============================================================
Añade un nuevo tipo de programa al motor de Descuentos y Fidelidad de Odoo 16:
- Tipo de programa: Compra X por $Y (Paquetes cerrados con remanentes a tarifa de lista)
- Modo de recompensa: Descuento por bloque de unidades (per_block)
- Control de listas de precios (Target Price / Tope dinámico y restricción por tarifa)
- Sincronización transparente y simultánea en Cotizaciones/Ventas y Punto de Venta (TPV)
    """,
    'author': 'Comercializadora Hiro',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'web',
        'loyalty',
        'sale_management',
        'sale_loyalty',
        'point_of_sale',
        'pos_loyalty',
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/loyalty_program_views.xml',
        'views/loyalty_reward_views.xml',
        'views/loyalty_rule_views.xml',
        'views/sale_order_views.xml',
        'wizard/sale_order_loyalty_check_wizard_views.xml',
        'wizard/loyalty_program_conflict_wizard_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'loyalty_bundle_pricing/static/src/js/sale_order_save_promo_confirm.js',
        ],
        'point_of_sale.assets': [
            'loyalty_bundle_pricing/static/src/js/Loyalty.js',
            'loyalty_bundle_pricing/static/src/js/ProductScreen.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
