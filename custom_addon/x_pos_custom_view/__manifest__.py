{
    "name": "x_pos_custom_view",
    "version": "16.0.0.1.",
    "category": "customization",
    "summary": "Modificación de vista de POS para Comercializadora Hiro",
    "author": "Luis Manjarrez",
    'website': "https://comercializadorahiro.com.mx",
    "depends": ['base','sale_management','point_of_sale', 'bi_remove_pos_lines', 'x_receipt_extrafields', 'pos_loyalty', 'pos_all_in_one','pos_sale_product_configurator'],
    "data": [
        "static/src/xml/x_custom_report.xml", 
    ],
    'assets': {
        'point_of_sale.assets': [            
#            "/x_pos_custom_view/static/src/js/x_PosGlobalStateCustom.js",
            "/x_pos_custom_view/static/src/js/x_model.js",
            "/x_pos_custom_view/static/src/js/x_db.js",                        
            "/x_pos_custom_view/static/src/js/x_CustomProductScreen.js",
            "/x_pos_custom_view/static/src/js/x_add_product.js",
            "/x_pos_custom_view/static/src/js/x_DoRefund.js",
            "/x_pos_custom_view/static/src/js/x_no_minus.js",        
            "/x_pos_custom_view/static/src/js/x_ChromeCustom.js",
                   
            "/x_pos_custom_view/static/src/js/x_FastRemoveOrderlineCustom.js",
            "/x_pos_custom_view/static/src/js/x_CreateDraftPOS.js",
            "/x_pos_custom_view/static/src/js/x_ExtendCreateSale.js",        
            "/x_pos_custom_view/static/src/js/x_ExtendImportSaleOrder.js",        
            "/x_pos_custom_view/static/src/js/x_CustomRegisterInvoicePaymentPopupWidget.js",
            "/x_pos_custom_view/static/src/xml/pos_custom_view.xml" 
              
               
#            "/x_pos_custom_view/static/src/css/button.css",
#            "/x_pos_custom_view/static/src/xml/assets.xml",
# button.css se modifica dentro de POS All In One para ajuste de 
# .pos .control-button para ajuste de entrelineado
        ],
    },
    "installable": True,
}