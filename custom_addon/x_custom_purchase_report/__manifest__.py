{
    'name': 'Custom Purchase Report',
    'version': '16.0.1.0.0',
    'category': 'Purchases',
    'summary': 'Formato horizontal para órdenes de compra con columnas personalizadas',
    'depends': ['purchase'],
    'data': [
        'reports/purchase_order_report.xml',
        'reports/purchasequotation_document.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}