odoo.define('pos_orders_all.CreateSale', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const { useListener } = require("@web/core/utils/hooks");
	let core = require('web.core');
	const { _t } = require('web.core')
	const Registries = require('point_of_sale.Registries');


	class CreateSale extends PosComponent {
		setup() {
            super.setup();
            var self = this;
            // if(!self.env.pos.config.module_pos_hr && self.env.pos.user.is_allow_sales_order){
            //     useListener('click', this.onClick);
            // }
            // if(self.env.pos.config.module_pos_hr && self.env.pos.cashier.is_allow_sales_order){
            // }
            useListener('click', this.onClick);
        }

        remove_current_orderlines(){
			let self = this;
			let order = self.env.pos.get_order();
			let orderlines = order.get_orderlines();
			
			var default_customer = this.env.pos.config.res_partner_id;
	        var default_customer_by_id = this.env.pos.db.get_partner_by_id(default_customer[0]);

	        if(default_customer_by_id){
				order.set_partner(default_customer_by_id);           

	        }else{
				order.set_partner(null);           
	        }
            if(this.env.pos.config.module_loyalty){
	            if (orderlines.length > 0) {
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

		async onClick(){
			var self = this;
			var order = self.env.pos.get_order();
			var orderlines = order.orderlines;
			var cashier_id = self.env.pos.get_cashier().id;
			var partner_id = false;
			var pos_product_list = [];

			if (order.get_partner() != null)
				partner_id = order.get_partner().id;
			
			if (!partner_id) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Unknown customer'),
					body: self.env._t('You cannot Create Sales Order. Select customer first.'),
				});
			}

			if (orderlines.length === 0) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Empty Order'),
					body: self.env._t('There must be at least one product in your order before Add a note.'),
				});
			}
			
			for (var i = 0; i < orderlines.length; i++) {
				var product_items = {
					'id': orderlines[i].product.id,
					'quantity': orderlines[i].quantity,
					'uom_id': orderlines[i].product.uom_id[0],
					'price': orderlines[i].price,
					'discount': orderlines[i].discount,
				};
				pos_product_list.push({'product': product_items });
			}
			
			self.rpc({
				model: 'pos.order',
				method: 'create_sales_order',
				args: [partner_id, partner_id, pos_product_list, cashier_id],
			}).then(function(output) {
				alert('Sales Order Created !!!!');
                self.remove_current_orderlines();
                // self.env.pos.add_new_order()
                self.showScreen('ProductScreen');
			});
		}
	}

	CreateSale.template = 'CreateSale';
	ProductScreen.addControlButton({
		component: CreateSale,
		condition: function () {
            if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_sales_order){
                return true;
            }else if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_sales_order){
                return true;
            }
        },
	});
	Registries.Component.add(CreateSale);
	return CreateSale;
});
