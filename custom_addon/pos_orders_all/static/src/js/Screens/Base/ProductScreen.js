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
                                self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
                            }
					    }else if(self.env.pos.config.pos_stock_type == "virtual"){
                            if (product.virtual_available <= 0){
                                call_super = false;
                                self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
                            }
					    }
                        else if(self.env.pos.config.pos_stock_type == "both"){
                            if (product.qty_available <= 0){
                                call_super = false;
                                self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
                            }
                            else if (product.virtual_available <= 0){
                                call_super = false;
                                self.showPopup('BiWarningPopup', {
                                    product: product,
                                    name: product.display_name,
                                });
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
            }
		};

	Registries.Component.extend(ProductScreen, BiProductScreen);

	return ProductScreen;

});
