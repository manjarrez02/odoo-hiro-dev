odoo.define('pos_all_in_one.RegisterInvoicePaymentRecipetScreen', function (require) {
	'use strict';

	const ReceiptScreen = require('point_of_sale.ReceiptScreen');
	const Registries = require('point_of_sale.Registries');

	const RegisterInvoicePaymentRecipetScreen = (ReceiptScreen) => {
		class RegisterInvoicePaymentRecipetScreen extends ReceiptScreen {
			setup() {
            	super.setup();
			}

			back() {
				this.props.resolve({ confirmed: true, payload: null });
				this.trigger('close-temp-screen');
			}
		}
		RegisterInvoicePaymentRecipetScreen.template = 'RegisterInvoicePaymentRecipetScreen';
		return RegisterInvoicePaymentRecipetScreen;
	};

	Registries.Component.addByExtending(RegisterInvoicePaymentRecipetScreen, ReceiptScreen);

	return RegisterInvoicePaymentRecipetScreen;
});
