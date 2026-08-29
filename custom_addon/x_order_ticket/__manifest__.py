{
    "name": "x_order_ticket",
    "version": "16.0.0.1.",
    "category": "customization",
    "summary": "Modificación de ticket para Comercializadora Hiro",
    "author": "Luis Manjarrez",
    'website': "https://comercializadorahiro.com.mx",
    'depends': ['base', 'sale', 'bi_zip_code_mapping'],
    'data': [
        'data/roll_paper.xml',
        'report/order_ticket.xml',
        'report/sale_order_photo.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
