odoo.define('pos_all_in_one.CashMoveReciept', function (require) {
	'use strict';

	const ReceiptScreen = require('point_of_sale.ReceiptScreen');
	const Registries = require('point_of_sale.Registries');

	const CashMoveReciept = (ReceiptScreen) => {
		class CashMoveReciept extends ReceiptScreen {
			setup() {
            	super.setup();
			}

			back() {
				this.props.resolve({ confirmed: true, payload: null });
				this.trigger('close-temp-screen');
			}
		}
		CashMoveReciept.template = 'CashMoveReciept';
		return CashMoveReciept;
	};

	Registries.Component.addByExtending(CashMoveReciept, ReceiptScreen);

	return CashMoveReciept;
});
