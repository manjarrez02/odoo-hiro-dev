odoo.define('x_pos_custom_view.x_FastRemoveOrderlineCustom', function (require) {
    'use strict';

    const FastRemoveOrderline = require('bi_remove_pos_lines.pos_fast_remove_orderline');
    const Registries = require('point_of_sale.Registries');
    const Popup = require('point_of_sale.ConfirmPopup');
    

    const FastRemoveOrderlineCustom = (FastRemoveOrderline) =>
    class extends FastRemoveOrderline {

            setup() {
                super.setup();
            }

            async onClick() {

                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Borrar orden?'),
                    body: this.env._t('¿Está seguro que desea eliminar esta orden?'),
                });
                if (confirmed === false) {
                    return;
                }				

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
                this.env.pos.toRefundLines = {};   
                var default_customer = this.env.pos.config.res_partner_id;
                var default_customer_by_id = this.env.pos.db.get_partner_by_id(default_customer[0]);
                if(default_customer_by_id){
                    this.env.pos.get_order().set_partner(default_customer_by_id);
                } else{
                    this.env.pos.get_order().set_partner(null);
                }         
            }
        };

    Registries.Component.extend(FastRemoveOrderline, FastRemoveOrderlineCustom);

});
