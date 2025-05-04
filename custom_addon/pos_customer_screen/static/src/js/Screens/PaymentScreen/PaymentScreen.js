odoo.define('pos_customer_screen.PaymentScreen', function(require) {
    'use strict';

    const PaymentScreen = require('point_of_sale.PaymentScreen')
    const Registries = require('point_of_sale.Registries');


    const PosCustPaymentScreen = PaymentScreen =>
        class extends PaymentScreen {
            setup(){
                super.setup();
            }
            relayMirrorData(){
                if(this.env.pos.config.customer_display){
                    this.currentOrder.mirror_image_data();
                }
            }
            addNewPaymentLine({ detail: paymentMethod }) {
                super.addNewPaymentLine(...arguments);
                this.relayMirrorData();
            }
            _updateSelectedPaymentline() {
                super._updateSelectedPaymentline(...arguments);
                this.relayMirrorData();
            }
            deletePaymentLine(event){
                super.deletePaymentLine(...arguments);
                this.relayMirrorData();
            }
        };

    Registries.Component.extend(PaymentScreen, PosCustPaymentScreen);

    return PaymentScreen;
});
