odoo.define('pos_orders_all.SeePOSOrdersButton', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const { useListener } = require("@web/core/utils/hooks");
	const Registries = require('point_of_sale.Registries');

	class SeePOSOrdersButton extends PosComponent {
		setup() {
            super.setup();
			useListener('click', this.onClick);
		}
		async onClick() {
			await this.showTempScreen('POSOrdersScreen', {
				'selected_partner_id': false 
			});
		}
	}
	SeePOSOrdersButton.template = 'SeePOSOrdersButton';

	ProductScreen.addControlButton({
		component: SeePOSOrdersButton,
		condition: function() {
			if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_orders){
				if(this.env.pos.config.show_order){
					return true
				}else{
					return true
				}
			}
			if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_orders){
				if(this.env.pos.config.show_order){
					return true
				}else{
					return true
				}
			}
		},
	});

	Registries.Component.add(SeePOSOrdersButton);

	return SeePOSOrdersButton;
});
