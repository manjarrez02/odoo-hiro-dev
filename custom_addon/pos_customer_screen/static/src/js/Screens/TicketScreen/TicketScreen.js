odoo.define('pos_customer_screen.TicketScreen', function(require) {
    'use strict';

    const TicketScreen = require('point_of_sale.TicketScreen')
    const Registries = require('point_of_sale.Registries');


    const PosCustTicketScreen = TicketScreen =>
        class extends TicketScreen {
            setup(){
                super.setup();
            }
            _onClickOrder(order) {
                super._onClickOrder(...arguments);
                if(this.env.pos.config.customer_display){
                    this.env.pos.get_order().mirror_image_data();
                }
            }
            _onCreateNewOrder(order) {
                super._onCreateNewOrder(...arguments);
                if(this.env.pos.config.customer_display){
                    this.env.pos.get_order().mirror_image_data();
                }
            }
        };

    Registries.Component.extend(TicketScreen, PosCustTicketScreen);

    return TicketScreen;
});
