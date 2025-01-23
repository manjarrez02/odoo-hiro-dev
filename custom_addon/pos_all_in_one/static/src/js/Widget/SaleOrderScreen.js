odoo.define('pos_all_in_one.SaleOrderScreen', function(require) {
	"use strict";

	const Registries = require('point_of_sale.Registries');
	const SaleOrderScreen = require('pos_orders_all.SaleOrderScreen');
	const { useListener } = require("@web/core/utils/hooks"); 

	const BiSaleOrderScreen = (SaleOrderScreen) =>
		class extends SaleOrderScreen {
			setup() {
	            super.setup();
	            useListener('click-printsaleorder', this.clickPrintSaleOrder);
	        }

	        async clickPrintSaleOrder({ detail: order }){
				let self = this;
				await self.rpc({
					model: 'sale.order',
					method: 'print_sale_order_receipt',
					args: [order.id],
				}).then(function(output) {
					let data = output;
					data['order'] = order;
					self.showTempScreen('SaleOrderPrintScreen',data);
				});

			}
		};

	Registries.Component.extend(SaleOrderScreen, BiSaleOrderScreen);

	return SaleOrderScreen;

});
