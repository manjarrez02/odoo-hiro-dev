odoo.define('pos_all_in_one.SeeAllProductsButtonWidget', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const Registries = require('point_of_sale.Registries');
	const { useListener } = require("@web/core/utils/hooks");	

	class SeeAllProductsButtonWidget extends PosComponent {
		setup() {
			super.setup();
			useListener('click', this.onClick);
		}

		async onClick() {
			await this.showTempScreen('POSProductScreen', {
				'selected_partner_id': false 
			});
		}
	}

	SeeAllProductsButtonWidget.template = 'SeeAllProductsButtonWidget';
	ProductScreen.addControlButton({
		component: SeeAllProductsButtonWidget,
		condition: function() {
			if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_products){
				if(this.env.pos.config.allow_pos_product_operations){
					return true
				}else{
					return true
				}
			}
			if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_products){
				if(this.env.pos.config.allow_pos_product_operations){
					return true
				}else{
					return true
				}
			}
		},
	});

	Registries.Component.add(SeeAllProductsButtonWidget);

	return SeeAllProductsButtonWidget;
});