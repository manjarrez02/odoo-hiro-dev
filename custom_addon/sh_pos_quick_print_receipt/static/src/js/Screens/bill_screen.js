odoo.define("sh_pos_quick_print_receipt.bill_screen", function (require) {
    "use strict";

    const ReceiptScreen = require('point_of_sale.ReceiptScreen');
    const Registries = require('point_of_sale.Registries');

    const ShBillScreen = (ReceiptScreen) => {
        class ShBillScreen extends ReceiptScreen {
            DemoprintReceipt() {
                this.printReceipt();
            }
            confirm() {
                this.props.resolve({ confirmed: true, payload: null });
                this.trigger('close-temp-screen');
            }
            whenClosing() {
                this.confirm();
            }
        }
        ShBillScreen.template = 'ShBillScreen';
        return ShBillScreen;
    };

    Registries.Component.addByExtending(ShBillScreen, ReceiptScreen);

    return ShBillScreen;

});
