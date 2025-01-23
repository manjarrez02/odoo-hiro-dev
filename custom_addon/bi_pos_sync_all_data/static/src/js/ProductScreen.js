// BiProductScreen js
odoo.define('bi_pos_sync_all_data.productScreen', function(require) {
    "use strict";

    const Registries = require('point_of_sale.Registries');
    const ProductScreen = require('point_of_sale.ProductScreen');

    const BiProductScreen = (ProductScreen) =>
        class extends ProductScreen {
            setup() {
                super.setup();
            }
            async _clickProduct(event) {
                let self = this;
                const product = event.detail;
                let allow_order = self.env.pos.config.allow_order;
                let deny_order= self.env.pos.config.deny_order || 0;
                let call_super = true;
                if (self.env.pos.config.allow_pos_sync_data && product.type == 'product'){
                    var partner_id = self.currentOrder.get_partner()
                    if (allow_order == false){
                        if(product.qty_available < deny_order){
                            call_super = false;
                            self.showPopup('ErrorPopup', {
                                title: self.env._t('Deny Order'),
                                body: self.env._t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                        }
                    }
                }
                if(call_super){
                    super._clickProduct(event);
                }
            }

            async _onClickPay() {
                var self = this;
                let order = this.env.pos.get_order();
                let lines = order.get_orderlines();
                let pos_config = self.env.pos.config; 
                let allow_order = pos_config.allow_order;
                let deny_order= pos_config.deny_order || 0;
                let call_super = true;
                if(pos_config.allow_pos_sync_data){
                    let prod_used_qty = {};
                    $.each(lines, function( i, line ){
                        let prd = line.product;
                        if (prd.type == 'product'){
                            if(prd.id in prod_used_qty){
                                let old_qty = prod_used_qty[prd.id][1];
                                prod_used_qty[prd.id] = [prd.qty_available,line.quantity+old_qty]
                            }else{
                                prod_used_qty[prd.id] = [prd.qty_available,line.quantity]
                            }
                        }
                    });
                    $.each(prod_used_qty, function( i, pq ){
                        let product = self.env.pos.db.get_product_by_id(i);
                        if (allow_order == false && pq[0] < pq[1]){
                            call_super = false;
                            self.showPopup('ErrorPopup', {
                                title: self.env._t('Deny Order'),
                                body: self.env._t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                        }
                        let check = pq[0] - pq[1];
                        if (allow_order == true && check < deny_order){
                            call_super = false;
                            self.showPopup('ErrorPopup', {
                                title: self.env._t('Deny Order'),
                                body: self.env._t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                        }
                    });
                }
                if(call_super){
                    super._onClickPay();
                }
            }
        };

    Registries.Component.extend(ProductScreen, BiProductScreen);

    return ProductScreen;

});
