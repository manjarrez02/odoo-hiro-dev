# -*- coding: utf-8 -*-
{
    'name': 'POS Product Image Lazy Load',
    'version': '16.0.1.0.0',
    'category': 'Point of Sale',
    'summary': 'Optimización de carga rápida de imágenes en POS (SQL Attachment Matcher y Lazy Loading)',
    'description': """
Optimización de Rendimiento de Imágenes en el Punto de Venta (Odoo 16)
=====================================================================
* Elimina la lectura masiva de binarios de imagen desde disco/filestore en el backend
  mediante una consulta indexada ultrarrápida a ir_attachment (SQL Attachment Matcher).
* Desactiva la pre-descarga masiva de imágenes de productos en el frontend (_preloadImages),
  evitando la saturación de workers de Odoo y la cola de conexiones HTTP del navegador.
* Habilita carga diferida (lazy loading) nativa en la visualización de productos.
    """,
    'author': 'Luis Manjarrez',
    'website': 'https://comercializadorahiro.com.mx',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'point_of_sale',
        'x_pos_custom_view',
    ],
    'data': [],
    'assets': {
        'point_of_sale.assets': [
            'pos_product_image_lazyload/static/src/js/Chrome.js',
            'pos_product_image_lazyload/static/src/xml/ProductItem.xml',
        ],
    },
    'installable': True,
    'auto_install': False,
    'application': False,
}