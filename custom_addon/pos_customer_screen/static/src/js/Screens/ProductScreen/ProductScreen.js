odoo.define('pos_customer_screen.ProductScreen', function(require) {
    'use strict';

    const ProductScreen = require('point_of_sale.ProductScreen')
    const Registries = require('point_of_sale.Registries');


    const PosCustProductScreen = ProductScreen =>
        class extends ProductScreen {
            setup(){
                super.setup();
            }
            async _setValue(val){
                await super._setValue(...arguments);
                if(this.env.pos.config.customer_display){
                    this.currentOrder.mirror_image_data();
                }
            }
        };

    Registries.Component.extend(ProductScreen, PosCustProductScreen);

    return ProductScreen;
});
