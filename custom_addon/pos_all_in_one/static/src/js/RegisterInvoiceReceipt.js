odoo.define('pos_all_in_one.RegisterInvoiceReceipt', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const Registries = require('point_of_sale.Registries');
	const { onMounted, useRef, status } = owl;

	class RegisterInvoiceReceipt extends PosComponent {
		setup() {
        	super.setup();
		}
	}
	RegisterInvoiceReceipt.template = 'RegisterInvoiceReceipt';

	Registries.Component.add(RegisterInvoiceReceipt);

	return RegisterInvoiceReceipt;
});
