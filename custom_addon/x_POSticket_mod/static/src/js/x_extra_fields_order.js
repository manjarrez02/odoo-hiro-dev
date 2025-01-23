odoo.define("x_POSticket_mod.x_extra_fields_order", function (require) {
    "use strict";
    
    const OrderReceipt = require("point_of_sale.OrderReceipt");
    const Registries = require("point_of_sale.Registries");
    const rpc = require('web.rpc');

    const PosResOrderReceipt = (OrderReceipt) =>
        class extends OrderReceipt {
            setup() {
                super.setup();
                var self = this;
                var order = self.props.order;

                rpc.query({
                    model: "pos.order",
                    method: "search_read",
                    domain: [["pos_reference", "=", order["name"]]],
                    fields: ["cust_saleper_id","account_move"],
                }).then(function (orders) {
                    if (orders.length > 0) {
                        // Asignar el valor correctamente
                        order.cust_saleper_id = orders[0].cust_saleper_id[1];
                        order.name_id = orders[0].name;
                        order.invoice_number = orders[0].account_move[1].split(" ")[0];
                        self.render();
                    }
                }).catch(function (error) {
                    console.error("Error fetching cust_saleper_id:", error);
                });
            }
        };

    Registries.Component.extend(OrderReceipt, PosResOrderReceipt);

    return PosResOrderReceipt;
});
