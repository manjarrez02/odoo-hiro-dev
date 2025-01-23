odoo.define('bi_remove_pos_lines.pos_fast_remove_orderline', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require("@web/core/utils/hooks");

    class FastRemoveOrderline extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this.onClick);
        }
        onClick() {
            let order = this.env.pos.get_order();
            let orderlines = order.get_orderlines();
            
            if(this.env.pos.config.module_loyalty){
                if(orderlines.length > 0){
                    orderlines.forEach(function (line) {
                        order.remove_orderline(line);
                    });
                }
            }else{
                while(orderlines.length > 0){
                    orderlines.forEach(function (line) {
                        order.remove_orderline(line);
                    });
                }
            }
           
        }
    }
    FastRemoveOrderline.template = 'FastRemoveOrderline';


    ProductScreen.addControlButton({
        component: FastRemoveOrderline,
        condition: function() {
            return this.env.pos.config.iface_fast_remove_orderline;
        },
    });

    Registries.Component.add(FastRemoveOrderline);
    return FastRemoveOrderline;

});