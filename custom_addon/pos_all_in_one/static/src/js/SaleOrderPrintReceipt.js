odoo.define('pos_all_in_one.SaleOrderPrintReceipt', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const Registries = require('point_of_sale.Registries');
	const { onMounted, useRef, status } = owl;

	class SaleOrderPrintReceipt extends PosComponent {
		setup() {
        	super.setup();
		}
	}
	SaleOrderPrintReceipt.template = 'SaleOrderPrintReceipt';

	Registries.Component.add(SaleOrderPrintReceipt);

	return SaleOrderPrintReceipt;
});
