{
    "name": "x_receipt_extrafields",
    "version": "16.0.0.1.",
    "category": "customization",
    "summary": "Agrega campos a ticket de Comercializadora Hiro",
    "author": "Luis Manjarrez",
    'website': "https://comercializadorahiro.com.mx",
    "depends": ['base','sale_management', 'bi_zip_code_mapping', 'point_of_sale'],
    "data": [
        

    ],
    'assets': {
        'point_of_sale.assets': [
            "/x_receipt_extrafields/static/src/js/x_receipt_efields.js",
            "/x_receipt_extrafields/static/src/js/x_receipt_contact_efields.js",         
        ],
    },
    "installable": True,
}

