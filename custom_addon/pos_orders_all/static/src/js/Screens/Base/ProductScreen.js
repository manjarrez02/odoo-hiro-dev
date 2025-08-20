// BiProductScreen js
odoo.define('pos_orders_all.productScreen', function(require) {
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
                var order = self.env.pos.get_order();
                let call_super = true;
				if(self.env.pos.config.pos_display_stock && product.type == 'product'){
                    if (self.env.pos.config.pos_restrict_product == true){
                        if(self.env.pos.config.pos_stock_type == "onhand"){
                            if (product.qty_available <= 0){
                                call_super = false;
                                 const { confirmed } = await self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
                                call_super = !!confirmed;
                            }
					    }else if(self.env.pos.config.pos_stock_type == "virtual"){
                            if (product.virtual_available <= 0){
                                call_super = false;
                                const { confirmed } = await self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
                                call_super = !!confirmed;
                            }
					    }
                        else if(self.env.pos.config.pos_stock_type == "both"){
                            if (product.qty_available <= 0){
                                call_super = false;
                                const { confirmed } = await self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
                                call_super = !!confirmed;
                            }
                            else if (product.virtual_available <= 0){
                                call_super = false;
                                const { confirmed } = await self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
                                call_super = !!confirmed;
                            }
                        }
					}
                }
                if(call_super){
                    super._clickProduct(event);
                }
                this.showScreen('PaymentScreen');
                this.showScreen('ProductScreen');
			}

			async _setValue(val) {
                var self = this
                if (this.currentOrder.get_selected_orderline()) {
                    
                    var line = this.currentOrder.get_selected_orderline()
                    if (
                        !line ||
                        !line.is_reward_line ||
                        (line.is_reward_line && ['', 'remove'].includes(val))
                    ) {
                        if (this.env.pos.numpadMode === 'quantity') {                        
                            if(val != 'remove' && val != '' && val > line.quantity){
                                if(self.env.pos.config.pos_display_stock && line.product.type == 'product'){
                                    if (self.env.pos.config.pos_restrict_product == true){
                                        if(self.env.pos.config.pos_stock_type == "onhand"){
                                            if (line.product.qty_available <= val){
                                                self.showPopup('BiWarningPopup', {
                                                    product: line.product,
                                                    name: line.product.display_name,
                                                    qty: val
                                                });
                                            }
                                        }else if(self.env.pos.config.pos_stock_type == "virtual"){
                                            if (line.product.virtual_available <= val){
                                                self.showPopup('BiWarningPopup', {
                                                    product: line.product,
                                                    name: line.product.display_name,
                                                    qty: val
                                                });
                                            }
                                        }
                                        else if(self.env.pos.config.pos_stock_type == "both"){
                                            if (line.product.virtual_available <= val){
                                                self.showPopup('BiWarningPopup', {
                                                    product: line.product,
                                                    name: line.product.display_name,
                                                    qty: val
                                                });
                                            }
                                            else if (line.product.qty_available <= val){
                                                self.showPopup('BiWarningPopup', {
                                                    product: line.product,
                                                    name: line.product.display_name,
                                                    qty: val
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                            this.currentOrder.get_selected_orderline().set_quantity(val);
                            this.showScreen('PaymentScreen');
                            this.showScreen('ProductScreen');
                        } else if (this.env.pos.numpadMode === 'discount') {
                            super._setValue(val)
                        } else if (this.env.pos.numpadMode === 'price') {
                            super._setValue(val)
                        }
                        if (this.env.pos.config.iface_customer_facing_display) {
                            this.env.pos.send_current_order_to_customer_facing_display();
                        }
                    }
                    if (!line) return;
                    if (line.is_reward_line && val === 'remove') {
                        this.currentOrder.disabledRewards.add(line.reward_id);
                        const coupon = this.env.pos.couponCache[line.coupon_id];
                        if (coupon && coupon.id > 0 && this.currentOrder.codeActivatedCoupons.find((c) => c.code === coupon.code)) {
                            delete this.env.pos.couponCache[line.coupon_id];
                            this.currentOrder.codeActivatedCoupons.splice(this.currentOrder.codeActivatedCoupons.findIndex((coupon) => {
                                return coupon.id === line.coupon_id;
                            }), 1);
                        }
                    }
                    if (!line.is_reward_line || (line.is_reward_line && val === 'remove')) {
                        line.order._updateRewards();
                    }
                }
            }
		};

	Registries.Component.extend(ProductScreen, BiProductScreen);

	return ProductScreen;

});
