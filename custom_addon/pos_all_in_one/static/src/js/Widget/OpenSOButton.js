odoo.define('pos_orders_all.OpenSOButton', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const { useListener } = require("@web/core/utils/hooks");
	const Registries = require('point_of_sale.Registries');

	class OpenSOButton extends PosComponent {
		setup() {
			super.setup();
			useListener('click', this.onClick);
		}
		
		async onClick() {
			await this.showTempScreen('SaleOrderScreen');
		}
	}
	OpenSOButton.template = 'OpenSOButton';

	ProductScreen.addControlButton({
		component: OpenSOButton,
		condition: function() {
			if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_sale_orders){
				if(this.env.pos.config.check){
					return true
				}else{
					return true
				}
			}
			if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_sale_orders){
				if(this.env.pos.config.check){
					return true
				}else{
					return true
				}
			}
		},
	});

	Registries.Component.add(OpenSOButton);

	return OpenSOButton;
});
