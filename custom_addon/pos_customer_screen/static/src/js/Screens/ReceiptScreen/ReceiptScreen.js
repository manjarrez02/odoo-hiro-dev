odoo.define('pos_customer_screen.ReceiptScreen', function(require) {
    'use strict';

    const ReceiptScreen = require('point_of_sale.ReceiptScreen')
    const Registries = require('point_of_sale.Registries');
    var rpc = require('web.rpc');


    const PosCustReceiptScreen = ReceiptScreen =>
        class extends ReceiptScreen {
            setup(){
                super.setup();
            }
            async orderDone() {
                super.orderDone(...arguments);
                if((this.currentOrder == null || this.currentOrder.orderlines.length != 0) && this.env.pos.config.customer_display){
                    var vals = {
                        'orderLines': false,
                        'total': false,
                        'tax': false,
                        'client_name':false,
                        'order_total':false,
                        'change_amount':false,
                        'payment_info':false,
                        'enable_customer_rating':this.env.pos.config.enable_customer_rating,
                        'set_customer':this.env.pos.config.set_customer,
                        'config_id':this.env.pos.config.id,
                        'new_order': true,
                        'client_uuid': localStorage.getItem('pos_client_uuid'),
                    }
                    console.log("Toca hacer broadcast en receiptscreen")
                    await this.rpc({
                        model: 'customer.display',
                        method: 'broadcast_data',
                        args: [vals],
                    })
                    .then(function(result) {});
                }else if(this.env.pos.config.customer_display && this.currentOrder.orderlines.length == 0){
                     this.currentOrder.mirror_image_data();
                }

            }
        };

    Registries.Component.extend(ReceiptScreen, PosCustReceiptScreen);

    return ReceiptScreen;
});
