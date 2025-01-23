odoo.define('pos_all_in_one.ReportProductButtonWidget', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const { useListener } = require("@web/core/utils/hooks");
	const Registries = require('point_of_sale.Registries');

	class ReportProductButtonWidget extends PosComponent {
		setup() {
			super.setup();
			useListener('click', this.onClick);
		}            
		async onClick(){
			var self = this;
			self.showPopup('PopupProductWidget',{
				'title': 'Product Summary',
			});
		}
	}

	ReportProductButtonWidget.template = 'ReportProductButtonWidget';
	ProductScreen.addControlButton({
		component: ReportProductButtonWidget,
		condition: function() {
			if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_product_summery){
				if(this.env.pos.config.product_summery){
					return true
				}else{
					return true
				}
			}
			if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_product_summery){
				if(this.env.pos.config.product_summery){
					return true
				}else{
					return true
				}
			}
		},
	});
	Registries.Component.add(ReportProductButtonWidget);
	return ReportProductButtonWidget;
});