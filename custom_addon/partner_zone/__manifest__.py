# -*- coding: utf-8 -*-
{
    'name': 'Partner Zone',
    'version': '16.0.1.0.0',
    'category': 'Contacts',
    'summary': 'Catálogo de zonas y asignación por cliente',
    'description': """
Módulo para gestionar un catálogo de zonas y asignar una zona (Many2one)
a cada cliente o contacto (res.partner), ubicado en el formulario de contacto
debajo de la categoría.
    """,
    'author': 'CobranzaHIRO',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'contacts',
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/partner_zone_views.xml',
        'views/res_partner_views.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
