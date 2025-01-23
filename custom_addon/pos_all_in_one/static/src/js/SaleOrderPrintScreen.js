odoo.define('pos_all_in_one.SaleOrderPrintScreen', function (require) {
	'use strict';

	const ReceiptScreen = require('point_of_sale.ReceiptScreen');
	const Registries = require('point_of_sale.Registries');

	const SaleOrderPrintScreen = (ReceiptScreen) => {
		class SaleOrderPrintScreen extends ReceiptScreen {
			setup() {
            	super.setup();
			}

			back() {
				this.props.resolve({ confirmed: true, payload: null });
				this.trigger('close-temp-screen');
			}
		}
		SaleOrderPrintScreen.template = 'SaleOrderPrintScreen';
		return SaleOrderPrintScreen;
	};

	Registries.Component.addByExtending(SaleOrderPrintScreen, ReceiptScreen);

	return SaleOrderPrintScreen;
});
