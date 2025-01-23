# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
    "name" : "POS All in one -Advance Point of Sale All in one Features for retail",
    "version" : "16.0.2.0",
    "category" : "Point of Sale",
    'summary': 'All in one pos Reprint pos Return POS Stock pos gift import sale from pos pos multi currency payment pos pay later pos internal transfer pos disable payment pos product template pos product operation pos loyalty rewards all pos reports pos stock pos retail',
    "description": """
    
  POS all in one -  advance app features pos Reorder pos Reprint pos Coupon Discount pos Order Return POS Stock pos gift pos order all pos all features pos discount pos order list print pos receipt pos item count pos bag charges import sale from pos create quote from pos pos multi currency payment  pos pay later pos internal transfer pos discable payment pos product template pos product create/update pos loyalty rewards pos reports
    
    """,
    "author": "BrowseInfo",
    "website" : "https://www.browseinfo.in",
    "price": 65,
    "currency": 'EUR',
    "depends" : ['base','sale_management','point_of_sale','pos_hr','pos_orders_all','pos_loyalty'],
    "data": [
        'security/ir.model.access.csv',
        'views/pos_reports_assets.xml',
        'views/pos_loyalty.xml',
        'views/pos_custom_view.xml',
        'views/POS_config_internal_transfer.xml',
        'views/custom_pos_disable_view.xml',
        'views/custom_pos_product_op_view.xml',
        'views/pos_config_inherit.xml',
        'views/custom_pos_paymentview.xml',
        'views/product_view.xml',
        'wizard/sales_summary_report.xml',
        'wizard/pos_sale_summary.xml',
        'wizard/x_report_view.xml',
        'wizard/z_report_view.xml',
        'wizard/top_selling.xml',
        'wizard/top_selling_report.xml',
        'wizard/profit_loss_report.xml',
        'wizard/pos_payment_report.xml',
        'wizard/profit_loss.xml',
        'wizard/pos_payment.xml',
        'wizard/warning_show.xml',
        'wizard/dropdown_user.xml',
        'wizard/user_pin.xml',
        'wizard/due_amount_warning.xml',
        'wizard/due_dropdown_user.xml',
        'wizard/due_user_pin.xml'
    ],

    "auto_install": False,
    'license': 'OPL-1',
    "installable": True,
    'assets': {
        'point_of_sale.assets': [
            "pos_all_in_one/static/src/css/new_base_update.css",
            #"pos_all_in_one/static/src/js/ProductwidgetExtends.js",

            "pos_all_in_one/static/src/js/load_model.js",

            #POS Payline Ref

            "pos_all_in_one/static/src/js/Screens/PaymentScreenPaymentLines.js",
            # POS Pay later

            "pos_all_in_one/static/src/js/Screens/PayPOSOrdersScreen.js",
            "pos_all_in_one/static/src/js/Screens/CreateDraftPOS.js",
            "pos_all_in_one/static/src/js/Screens/UnpaidOrderSearchButton.js",
            "pos_all_in_one/static/src/js/Screens/PosOrdersDetailRestric.js",
            "pos_all_in_one/static/src/js/Screens/PaymentScreen.js",
            #
            # # POS Product Template

            "pos_all_in_one/static/src/css/product.css",
            "pos_all_in_one/static/src/js/ProductTemplateListWidget.js",
            "pos_all_in_one/static/src/js/screens.js",
            "pos_all_in_one/static/src/js/salesPersons.js",
            "pos_all_in_one/static/src/js/BiProductScreen.js",
            "pos_all_in_one/static/src/js/ProductTemplatePopupWidget.js",
            "pos_all_in_one/static/src/js/XMLPosPaymentSummaryReceipt.js",

            # pos product operation

            
            "pos_all_in_one/static/src/js/Popup/POSProductDetail.js",
            "pos_all_in_one/static/src/js/Popup/ProductDetailsCreate.js",
            "pos_all_in_one/static/src/js/Popup/ProductDetailsEdit.js",
            "pos_all_in_one/static/src/js/Screens/POSProduct.js",
            "pos_all_in_one/static/src/js/Screens/POSProductScreen.js",
            "pos_all_in_one/static/src/js/Widget/SeeAllProductsButtonWidget.js",

            # POS multi Currency

            "pos_all_in_one/static/src/css/button.css",
            "pos_all_in_one/static/src/js/pos_data.js",
            "pos_all_in_one/static/src/js/BiPaymentScreen.js",

            # Add custom js for pos_disable_payments

            "pos_all_in_one/static/src/js/CustomNumpadWidget.js",

            # Add custom js for pos_payments

            "pos_all_in_one/static/src/css/pos_payment.css",
            "pos_all_in_one/static/src/js/pos_payment.js",
            "pos_all_in_one/static/src/js/Widget/CreatePaymentButtonWidget.js",
            "pos_all_in_one/static/src/js/Widget/SeeAllInvoicesButtonWidget.js",
            "pos_all_in_one/static/src/js/Popup/RegisterInvoicePaymentPopupWidget.js",
            "pos_all_in_one/static/src/js/Popup/PosInvoiceDetail.js",
            "pos_all_in_one/static/src/js/Popup/RegisterPaymentPopupWidget.js",
            "pos_all_in_one/static/src/js/Screens/POSInvoiceScreen.js",
            "pos_all_in_one/static/src/js/Screens/PartnerListScreen.js",
            "pos_all_in_one/static/src/js/Screens/POSInvoice.js",

            # # Add custom js for pos_loyalty

            
            "pos_all_in_one/static/src/js/OrderWidgetExtended.js",
            "pos_all_in_one/static/src/js/LoyaltyButtonWidget.js",
            "pos_all_in_one/static/src/js/LoyaltyPopupWidget.js",
            #
            # # Add custom js for pos_internal
            #
            "pos_all_in_one/static/src/js/Screens/PosTransferWidget.js",
            "pos_all_in_one/static/src/js/Popup/PosInternalStockPopupWidget.js",

            #
            # # Add custom js for pos_report

            "pos_all_in_one/static/src/js/ReportPaymentButtonWidget.js",
            
            "pos_all_in_one/static/src/js/PaymentSummaryPopup.js",
            "pos_all_in_one/static/src/js/PaymentReceiptWidget.js",

            "pos_all_in_one/static/src/js/ReportProductButton/ReportProductButtonWidget.js",
            "pos_all_in_one/static/src/js/ReportProductButton/PopupProductWidget.js",
            "pos_all_in_one/static/src/js/ReportProductButton/ProductReceiptWidget.js",
            "pos_all_in_one/static/src/js/ReportProductButton/XMLPosProductSummaryReceipt.js",

            "pos_all_in_one/static/src/js/AuditReport/ReportLocationButtonWidget.js",
            "pos_all_in_one/static/src/js/AuditReport/PopupLocationWidget.js",
            "pos_all_in_one/static/src/js/AuditReport/LocationReceiptWidget.js",
            "pos_all_in_one/static/src/js/AuditReport/LLocationSummaryReceipt.js",

            "pos_all_in_one/static/src/js/CategorySummary/ReportCategoryButtonWidget.js",
            "pos_all_in_one/static/src/js/CategorySummary/PopupCategoryWidget.js",
            "pos_all_in_one/static/src/js/CategorySummary/CategoryReceiptWidget.js",
            "pos_all_in_one/static/src/js/CategorySummary/XMLPosCategorySummaryReceipt.js",

            "pos_all_in_one/static/src/js/OrderSummary/ReportOrderButtonWidget.js",
            "pos_all_in_one/static/src/js/OrderSummary/PopupOrderWidget.js",
            "pos_all_in_one/static/src/js/OrderSummary/OrderReceiptWidget.js",
            "pos_all_in_one/static/src/js/OrderSummary/XMLPosOrderSummaryReceipt.js",

            "pos_all_in_one/static/src/js/OrderWidget.js",
            
            "pos_all_in_one/static/src/css/reports.css",

            'pos_all_in_one/static/src/xml/product_view.xml',
            'pos_all_in_one/static/src/xml/pos_new.xml',
            'pos_all_in_one/static/src/xml/pos_internal_transfer.xml',
            'pos_all_in_one/static/src/xml/main_screen_extends.xml',
            'pos_all_in_one/static/src/xml/pos_loyalty.xml',
            'pos_all_in_one/static/src/xml/pay_later.xml',
            'pos_all_in_one/static/src/xml/pos_payment.xml',
            'pos_all_in_one/static/src/xml/pos_multi_currency.xml',
            'pos_all_in_one/static/src/xml/pos_reports.xml',
            'pos_all_in_one/static/src/xml/pos_disable.xml',
            
            # customization
            'pos_all_in_one/static/src/xml/pos_user_access_payment.xml',

            ('replace', 'point_of_sale/static/src/xml/Screens/ProductScreen/ControlButtons/RefundButton.xml',
             'pos_all_in_one/static/src/xml/RefundButton.xml'),
            ('replace', 'point_of_sale/static/src/js/Screens/ProductScreen/ControlButtons/RefundButton.js',
             'pos_all_in_one/static/src/js/Widget/RefundButton.js'),

            ('replace', 'point_of_sale/static/src/xml/Screens/ProductScreen/ControlButtons/ProductInfoButton.xml',
             'pos_all_in_one/static/src/xml/ProductInfoButton.xml'),
            ('replace', 'point_of_sale/static/src/js/Screens/ProductScreen/ControlButtons/ProductInfoButton.js',
             'pos_all_in_one/static/src/js/Widget/ProductInfoButton.js'),

            ('replace', 'point_of_sale/static/src/xml/Screens/ProductScreen/ControlButtons/OrderlineCustomerNoteButton.xml',
             'pos_all_in_one/static/src/xml/OrderlineCustomerNoteButton.xml'),
            ('replace', 'point_of_sale/static/src/js/Screens/ProductScreen/ControlButtons/OrderlineCustomerNoteButton.js',
             'pos_all_in_one/static/src/js/Widget/OrderlineCustomerNoteButton.js'),

            ('replace', 'pos_sale/static/src/xml/SetSaleOrderButton.xml',
             'pos_all_in_one/static/src/xml/SetSaleOrderButton.xml'),
            ('replace', 'pos_sale/static/src/js/SetSaleOrderButton.js',
             'pos_all_in_one/static/src/js/Widget/SetSaleOrderButton.js'),

            ('replace', 'pos_orders_all/static/src/xml/gift_coupon_voucher.xml',
             'pos_all_in_one/static/src/xml/GiftCouponButton.xml'),
            ('replace', 'pos_orders_all/static/src/js/Screens/ControlButtons/GiftCouponButton.js',
             'pos_all_in_one/static/src/js/Widget/GiftCouponButton.js'),

            ('replace', 'pos_orders_all/static/src/xml/sale_orders.xml',
             'pos_all_in_one/static/src/xml/CreateSale.xml'),
            ('replace', 'pos_orders_all/static/src/js/Screens/ControlButtons/CreateSale.js',
             'pos_all_in_one/static/src/js/Widget/CreateSale.js'),

            ('replace', 'pos_orders_all/static/src/js/Screens/ControlButtons/ReturnOrderButton.js',
             'pos_all_in_one/static/src/js/Widget/ReturnOrderButton.js'),

            ('replace', 'pos_orders_all/static/src/js/Screens/ControlButtons/OpenSOButton.js',
             'pos_all_in_one/static/src/js/Widget/OpenSOButton.js'),

            ('replace', 'pos_orders_all/static/src/js/Screens/ControlButtons/SeePOSOrdersButton.js',
             'pos_all_in_one/static/src/js/Widget/SeePOSOrdersButton.js'),

            ('replace', 'pos_loyalty/static/src/js/ControlButtons/ResetProgramsButton.js',
             'pos_all_in_one/static/src/js/Widget/ResetProgramsButton.js'),

            ('replace', 'pos_loyalty/static/src/js/ControlButtons/RewardButton.js',
             'pos_all_in_one/static/src/js/Widget/RewardButton.js'),

            ('replace', 'pos_loyalty/static/src/js/ControlButtons/PromoCodeButton.js',
             'pos_all_in_one/static/src/js/Widget/PromoCodeButton.js'),

            'pos_all_in_one/static/src/xml/ProductScreen/ProductScreen.xml',

            'pos_all_in_one/static/src/xml/RegisterInvoicePaymentRecipetScreen.xml',

            'pos_all_in_one/static/src/js/RegisterInvoicePaymentRecipetScreen.js',
            'pos_all_in_one/static/src/js/RegisterInvoiceReceipt.js',

            'pos_all_in_one/static/src/js/Widget/SaleOrderScreen.js',

            'pos_all_in_one/static/src/xml/SaleOrderPrintScreen.xml',
            'pos_all_in_one/static/src/js/SaleOrderPrintScreen.js',
            'pos_all_in_one/static/src/js/SaleOrderPrintReceipt.js',

            'pos_all_in_one/static/src/xml/CashMovePopup.xml',

            'pos_all_in_one/static/src/xml/CashMoveReciept.xml',
            'pos_all_in_one/static/src/js/CashMoveReciept.js',
            'pos_all_in_one/static/src/js/CashDataReceipt.js',

            ('replace', 'point_of_sale/static/src/js/ChromeWidgets/CashMoveButton.js',
             'pos_all_in_one/static/src/js/Widget/CashMoveButton.js'),

            'pos_all_in_one/static/src/xml/BiErrorPopup.xml',
            'pos_all_in_one/static/src/js/Popup/BiErrorPopup.js',
        ],
    },
    "live_test_url":'https://youtu.be/3UcvG6ukjZE',
    "images":["static/description/Banner.gif"],
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
