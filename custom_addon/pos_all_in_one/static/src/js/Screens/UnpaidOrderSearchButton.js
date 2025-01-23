odoo.define('pos_all_in_one.UnpaidOrderSearchButton', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const { useListener } = require("@web/core/utils/hooks");
	const Registries = require('point_of_sale.Registries');
	const POSOrdersScreen= require('pos_orders_all.POSOrdersScreen');


	class UnpaidOrderSearchButton extends PosComponent {
		setup() {
			super.setup();
			useListener('click', this.onClick);
		}

		remove_current_orderlines(){
			let self = this;
			let order = self.env.pos.get_order();
			let orderlines = order.get_orderlines();
			order.set_partner(null);           
			while (orderlines.length > 0) {
				orderlines.forEach(function (line) {
					order.remove_orderline(line);
				});
			}
		}

		get_current_day() {
			let today = new Date();
			let dd = today.getDate();
			let mm = today.getMonth()+1; //January is 0!
			let yyyy = today.getFullYear();
			if(dd<10){
				dd='0'+dd;
			} 
			if(mm<10){
				mm='0'+mm;
			} 
			today = yyyy+'-'+mm+'-'+dd;
			return today;
		}
			
		async onClick() {
			let self = this;
			const PosOrder = new (Registries.Component.get(POSOrdersScreen))(this, {
			'selected_partner_id': false 
			});

			let selectedOrder = self.env.pos.get_order();
			let partner_id = false
			let client = false
			
			
			if(selectedOrder.get_orderlines().length > 0){
				const { confirmed } = await this.showPopup('PosOrdersDetailRestric',{})
				return
			}
			let load_orders = [];
			let load_orders_line = [];
			let order_ids = [];

			const pos_domain =PosOrder.get_orders_domain ||[];
			let output = await self.rpc({
				model: 'pos.order',
				method: 'search_read',
				args: [[['state', 'in', ['draft', 'done','invoiced']], ['session_id', '=', self.env.pos.pos_session.id]]],
			});
			if (self.env.pos.config.pos_session_limit == 'current_day')
			{
				let today = self.get_current_day();
				output.forEach(function(i) {
					if(i.date_order >= today + ' 00:00:00' && i.date_order <= today + ' 23:59:59')
					{
						load_orders.push(i);
					}
				});
			}
			else{
				load_orders = output;
			}
			self.env.pos.db.get_orders_by_id = {};
			self.env.pos.db.get_orders_by_barcode = {};
			self.env.pos.db.get_orders_by_order_ref = {};


			load_orders.forEach(function(order) {
				order_ids.push(order.id)
				self.env.pos.db.get_orders_by_id[order.id] = order;		
				self.env.pos.db.get_orders_by_barcode[order.barcode] = order;						
				self.env.pos.db.get_orders_by_order_ref[order.name] = order;						
			});


			const { confirmed, payload: inputNote } = await this.showPopup('TextInputPopup', {
				title: this.env._t('Find Order Using Barcode or Order Ref'),
			});

			if (confirmed) {
				let entered_barcode = inputNote;

				let order = self.env.pos.db.get_orders_by_barcode[entered_barcode];

				let fields_domain = [['order_id','=',order.id]];
				let output1 = await self.rpc({
					model: 'pos.order.line',
					method: 'search_read',
					args: [fields_domain],
				});
				self.env.pos.db.all_orders_line_list = output1;
				load_orders_line = output1;
	
				self.env.pos.synch.all_orders_list = load_orders
				self.env.pos.synch.all_orders_list = output1					
				self.orders = load_orders;
				self.orderlines = output1;
	
				self.env.pos.db.get_orderline_by_id = {};
				output1.forEach(function(ol) {
					self.env.pos.db.get_orderline_by_id[ol.id] = ol;						
				});
				
				//let order = self.env.pos.db.get_orders_by_barcode[entered_barcode];

				if(order == undefined){
					order = self.env.pos.db.get_orders_by_order_ref[entered_barcode];					
				}

				if(order){
					if(order.state != "draft"){
						return this.showPopup('ErrorPopup', {
							title: this.env._t('This order is already paid!'),
						});


					}
					let amount_due = order.amount_total - order.amount_paid

					if (order && order.partner_id != null){
						partner_id = order.partner_id[0];
						client = self.env.pos.db.get_partner_by_id(partner_id);
					}
			
					let orderlines = [];
					$.each(order.lines, function(index, value) {
						let ol = self.env.pos.db.get_orderline_by_id[value];
						orderlines.push(ol);
					});

					//self.remove_current_orderlines();
					if(orderlines.length > 0){
						selectedOrder.name = order.pos_reference;
						selectedOrder.is_partial = order.is_partial;
						selectedOrder.amount_due = amount_due;
						selectedOrder.barcode = order.barcode;
						selectedOrder.barcode_img = order.barcode_img;
						selectedOrder.is_paying_partial = true;
						selectedOrder.amount_paid  = order.amount_paid;
					}

					if (order.partner_id) {
						let client = self.env.pos.db.get_partner_by_id(order.partner_id[0]);
						selectedOrder.set_partner(client);
					}

					orderlines.forEach(function(ol) {
						let product = self.env.pos.db.get_product_by_id(ol.product_id[0]);
						selectedOrder.add_product(product, {
							quantity: parseFloat(ol.qty),
							price: ol.price_unit,
							discount: ol.discount,
							is_saved: true,
						});
					});

					if(amount_due > 0 && order.amount_paid != 0)
					{
						let product_for_due = self.env.pos.config.partial_product_id;
						if(product_for_due)
						{
							let prd = self.env.pos.db.get_product_by_id(product_for_due[0]);
							selectedOrder.add_product(prd,{
								quantity: 1.0,
								price: -order.amount_paid,
								discount: 0
							});
						}
						else{
							return self.showPopup('ErrorPopup', {
								title: self.env._t('Configure Product'),
								body: self.env._t('Please configure partial product.'),
							});
						}
					}

					if(selectedOrder.orderlines.length > 0){
						self.showScreen('PaymentScreen');			
					}
				}else{
					self.showPopup('ErrorPopup', {
						'title': self.env._t('Invalid Barcode'),
						'body': self.env._t("No Order Found for this Barcode"),
					});
				}
			}
		}
	}
	UnpaidOrderSearchButton.template = 'UnpaidOrderSearchButton';

	ProductScreen.addControlButton({
		component: UnpaidOrderSearchButton,
		condition: function() {
			if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_find_order){
				if(this.env.pos.config.allow_partical_payment){
					return true
				}else{
					return true
				}
			}
			if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_find_order){
				if(this.env.pos.config.allow_partical_payment){
					return true
				}else{
					return true
				}
			}
		},
	});

	Registries.Component.add(UnpaidOrderSearchButton);

	return UnpaidOrderSearchButton;
});
