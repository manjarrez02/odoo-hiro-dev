{
    "name": "x_POSticket_mod",
    "version": "16.0.0.1.",
    "category": "customization",
    "summary": "Modificación de ticket para Comercializadora Hiro",
    "author": "Luis Manjarrez",
    'website': "https://comercializadorahiro.com.mx",
    "depends": ['base','sale_management','point_of_sale', 'x_receipt_extrafields', 'pos_loyalty', 'pos_all_in_one'],
    "data": [
        

    ],
    'assets': {
        'point_of_sale.assets': [
            "/x_POSticket_mod/static/src/css/receipt_custom.css",
            "/x_POSticket_mod/static/src/xml/pos_customizations.xml",
            "/x_POSticket_mod/static/src/xml/pos_customizations_reprint.xml",
            "/x_POSticket_mod/static/src/xml/pos_orderlines.xml", 
            "/x_POSticket_mod/static/src/xml/pos_customizations_saleorder.xml",
            "/x_POSticket_mod/static/src/js/x_extra_fields_order.js",           
        ],
    },
    "installable": True,
}

