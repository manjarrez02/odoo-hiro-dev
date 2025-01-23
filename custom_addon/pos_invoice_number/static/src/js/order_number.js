odoo.define("pos_order_number.receiptScreen", function (require) {
    "use strict";

    const OrderReceipt = require("point_of_sale.OrderReceipt");
    const Registries = require("point_of_sale.Registries");
    const rpc = require('web.rpc');
    const { onMounted } = owl;

    const PosResOrderReceipt = (OrderReceipt) =>
        class extends OrderReceipt {
            setup() {
                super.setup();
                var self = this;
                var order = self.props.order;
                if (order.is_to_invoice()) {
                    rpc.query({
                        model: "pos.order",
                        method: "search_read",
                        domain: [["pos_reference", "=", order["name"]]],
                        fields: ["account_move"],
                    }).then(function (orders) {
                        if (orders.length > 0 && orders[0]["account_move"] && orders[0]["account_move"][1]) {
                            var invoice_number = orders[0]["account_move"][1].split(" ")[0];
                            order["invoice_number"] = invoice_number;
                        }
                        self.render();
                    });
                }
            }
        };

    Registries.Component.extend(OrderReceipt, PosResOrderReceipt);

    return PosResOrderReceipt
})
