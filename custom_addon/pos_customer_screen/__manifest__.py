# -*- coding: utf-8 -*-
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################

# vim:expandtab: :tabstop=4:softtabstop=4:shiftwidth=4:
{
    'name': 'POS Customer Screen (Community)',
    'version': '1.0.1',
    'category': 'Point of Sale',
    'website': 'http://www.acespritech.com',
    'price': 35.0,
    'currency': 'EUR',
    'summary': "Allows Seller's to promote there new products and customers can also see there products.",
    'description': "Allows Seller's to promote there new products and customers can also see there products.",
    'author': "Acespritech Solutions Pvt. Ltd.",
    'website': "www.acespritech.com",
    'depends': ['point_of_sale','pos_all_in_one','x_pos_custom_view','bi_remove_pos_lines','bus', 'web', 'hr'],
    'data': [
        'security/ir.model.access.csv',
        'views/pos_assets.xml',
        'views/pos_config_views.xml',
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'point_of_sale.assets': [
            'pos_customer_screen/static/src/css/pos.css',
            'pos_customer_screen/static/src/js/Chrome.js',
            'pos_customer_screen/static/src/js/models.js',
            'pos_customer_screen/static/src/js/CustomerDisplay.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/Slider/Arrow.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/Slider/Slide.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/Slider/Slider.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/Slider/SliderContent.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/CustomerOrderline.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/LeftWidget.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/PaymentDetail.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/PaymentLines.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/Ratings.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/RightWidget.js',
            'pos_customer_screen/static/src/js/CustomerDisplayWidgets/VideoSlider.js',
            'pos_customer_screen/static/src/js/Popups/CustomerCreatePopup.js',
            'pos_customer_screen/static/src/js/Popups/CustomerFeedbackPopup.js',
            'pos_customer_screen/static/src/js/Popups/SignaturePopup.js',
            'pos_customer_screen/static/src/js/Screens/ChromeWidgets/CustomerScreenButton.js',
            'pos_customer_screen/static/src/js/Screens/PaymentScreen/PaymentScreen.js',
            'pos_customer_screen/static/src/js/Screens/ProductScreen/ProductScreen.js',
            'pos_customer_screen/static/src/js/Screens/ReceiptScreen/ReceiptScreen.js',
            'pos_customer_screen/static/src/js/Screens/TicketScreen/TicketScreen.js',
            'pos_customer_screen/static/src/js/flashcanvas.js',
            'pos_customer_screen/static/src/js/jSignature.min.js',
            'pos_customer_screen/static/src/xml/**/*',
        ],
        'pos_customer_screen.assets_backend_prod_only': [
            'pos_customer_screen/static/src/entry/chrome_adapter.js',
            'pos_customer_screen/static/src/entry/main.js',
            'web/static/src/start.js',
            'web/static/src/legacy/legacy_setup.js',
        ],
    },
    'images': ['static/description/main_screenshot.png'],
    'installable': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
