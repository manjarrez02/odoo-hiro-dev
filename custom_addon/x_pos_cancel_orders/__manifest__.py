{
    "name": "x_pos_cancel_orders",
    "version": "16.0.0.1.",
    "category": "customization",
    "summary": "Cancela ordenes no procesadas en el POS de Comercializadora Hiro",
    "author": "Luis Manjarrez",
    'website': "https://comercializadorahiro.com.mx",
    "depends": ['base','sale_management','point_of_sale','pos_all_in_one'],
    "data": [
        
    ],
    'assets': {
        'point_of_sale.assets': [
            "/x_pos_cancel_orders/static/src/js/CustomClosePosPopup.js",           
        ],
    },
    "installable": True,
}

