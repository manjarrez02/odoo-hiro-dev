{
    "name": "x_invoice_ticket",
    "version": "16.0.0.1.",
    "category": "customization",
    "summary": "Modificación de ticket para Comercializadora Hiro",
    "author": "Luis Manjarrez",
    'website': "https://comercializadorahiro.com.mx",
    'depends': ['base', 'account','sale_management', 'bi_zip_code_mapping'],
    'data': [
        'data/roll_paper.xml',
        'report/invoice_ticket.xml',
        'report/invoice_payment_ticket.xml',
        'report/payment_ticket.xml',
        'report/invoice_delivery_ticket.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
