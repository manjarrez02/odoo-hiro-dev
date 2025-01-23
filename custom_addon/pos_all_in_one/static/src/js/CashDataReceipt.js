odoo.define('pos_all_in_one.CashDataReceipt', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const Registries = require('point_of_sale.Registries');

	class CashDataReceipt extends PosComponent {
		setup() {
			super.setup();
		}
	}

	CashDataReceipt.template = 'CashDataReceipt';
	Registries.Component.add(CashDataReceipt);
	return CashDataReceipt;
});