odoo.define("sh_pos_quick_print_receipt.ActionButton", function (require) {
    "use strict";

    const PosComponent = require("point_of_sale.PosComponent");
    const Registries = require("point_of_sale.Registries");
    const ProductScreen = require("point_of_sale.ProductScreen");
    const { useListener } = require("@web/core/utils/hooks");

    class QuickPrintButton extends PosComponent {
        setup() {
            super.setup();
            useListener("click-print-receipt", this.onClickPrintReceiptButton);
        }
        async onClickPrintReceiptButton() {
            const order = this.env.pos.get_order();
            if (order.get_orderlines().length > 0) {
                await this.showTempScreen('ShBillScreen');
                
            } else {
                await this.showPopup('ErrorPopup', {
                    title: this.env._t('Nothing to Print'),
                    body: this.env._t('There are no order lines'),
                });
            }
        }
    }
    QuickPrintButton.template = "QuickPrintButton";
    ProductScreen.addControlButton({
        component: QuickPrintButton,
        condition: function () {
            return this.env.pos.config.sh_is_quick_receipt_print;
        },
    });
    Registries.Component.add(QuickPrintButton);

    return {
        QuickPrintButton,
    };
});
