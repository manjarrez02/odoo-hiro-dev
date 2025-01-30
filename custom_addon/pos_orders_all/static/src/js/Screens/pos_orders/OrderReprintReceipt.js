odoo.define('pos_orders_all.OrderReprintReceipt', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { onMounted, onWillUpdateProps } = owl;

    class OrderReprintReceipt extends PosComponent {
        constructor() {
            super(...arguments);
            onMounted(() => {
                this.generateBarcode(this.props.barcode);
            });

            onWillUpdateProps((nextProps) => {
                if (nextProps.barcode !== this.props.barcode) {
                    this.generateBarcode(nextProps.barcode);
                }
            });
        }

        generateBarcode(barcode) {
            setTimeout(() => {
                $("#barcode_print1").barcode(
                    barcode,
                    "code128",
                    { output: "svg" }
                );
            }, 100);
        }
    }

    OrderReprintReceipt.template = 'OrderReprintReceipt';
    Registries.Component.add(OrderReprintReceipt);

    return OrderReprintReceipt;
});
