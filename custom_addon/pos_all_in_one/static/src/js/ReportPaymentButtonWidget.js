odoo.define('pos_all_in_one.ReportPaymentButtonWidget', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const { useListener } = require("@web/core/utils/hooks");
    const Registries = require('point_of_sale.Registries');

    class ReportPaymentButtonWidget extends PosComponent {
        setup() {
            super.setup();
            // useListener('click-product-template', this.add_product_variant);
            useListener('click', this.onClick);
        }

        async onClick(){
            var self = this;
            self.showPopup('PopupPaymentWidget',{
                'title': 'Payment Summary',
            });
        }

        
    }
    
    ReportPaymentButtonWidget.template = 'ReportPaymentButtonWidget';
    ProductScreen.addControlButton({
        component: ReportPaymentButtonWidget,
        condition: function() {
            if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_payment_summery){
                if(this.env.pos.config.payment_summery){
                    return true
                }else{
                    return true
                }
            }
            if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_payment_summery){
                if(this.env.pos.config.payment_summery){
                    return true
                }else{
                    return true
                }
            }
        },
    });
    Registries.Component.add(ReportPaymentButtonWidget);
    return ReportPaymentButtonWidget;
});