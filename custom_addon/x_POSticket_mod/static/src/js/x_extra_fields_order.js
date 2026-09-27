odoo.define("x_POSticket_mod.x_extra_fields_order", function (require) {
    "use strict";
    
    const OrderReceipt = require("point_of_sale.OrderReceipt");
    const { Order } = require("point_of_sale.models");
    const Registries = require("point_of_sale.Registries");
    const rpc = require('web.rpc');
    const utils = require('web.utils');
    const round_pr = utils.round_precision;

    const PosTicketOrder = (Order) =>
        class extends Order {
            get_total_discount() {
                let total = super.get_total_discount ? super.get_total_discount(...arguments) : 0;
                let promoDiscount = 0;
                for (const line of this.get_orderlines()) {
                    if (line.is_reward_line || line.reward_id || (line.get_quantity() > 0 && line.get_display_price() < 0)) {
                        promoDiscount += Math.abs(line.get_display_price());
                    } else if (line.is_reward_line && line.get_display_price() === 0) {
                        const unitPrice = line.get_taxed_lst_unit_price ? line.get_taxed_lst_unit_price() : line.get_unit_price();
                        promoDiscount += unitPrice * line.get_quantity();
                    }
                }
                return round_pr(total + promoDiscount, this.pos.currency.rounding);
            }

            get_fixed_discount() {
                let total = super.get_fixed_discount ? super.get_fixed_discount(...arguments) : 0;
                let promoDiscount = 0;
                for (const line of this.get_orderlines()) {
                    if (line.is_reward_line || line.reward_id || (line.get_quantity() > 0 && line.get_display_price() < 0)) {
                        promoDiscount += Math.abs(line.get_display_price());
                    } else if (line.is_reward_line && line.get_display_price() === 0) {
                        const unitPrice = line.get_taxed_lst_unit_price ? line.get_taxed_lst_unit_price() : line.get_unit_price();
                        promoDiscount += unitPrice * line.get_quantity();
                    }
                }
                return round_pr(total + promoDiscount, this.pos.currency.rounding);
            }

            export_for_printing() {
                const receipt = super.export_for_printing();
                receipt.total_discount = this.get_total_discount();
                return receipt;
            }
        };

    Registries.Model.extend(Order, PosTicketOrder);

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
                    fields: ["cust_saleper_id", "account_move", "is_credit_sale", "max_credit_discount"],
                }).then(function (orders) {
                    if (orders.length > 0) {
                        // Asignar el valor correctamente
                        if (orders[0].cust_saleper_id) {
                            order.cust_saleper_id = orders[0].cust_saleper_id[1];
                        }
                        order.name_id = orders[0].name;
                        if (orders[0].account_move && orders[0].account_move[1]) {
                            order.invoice_number = orders[0].account_move[1].split(" ")[0];
                        }
                        if (orders[0].is_credit_sale) {
                            order.isCreditSale = true;
                        }
                        if (orders[0].max_credit_discount) {
                            order.max_credit_discount = orders[0].max_credit_discount;
                        }

                        // Refrescar el entorno del recibo para que tome el estado de crédito y ahorro potencial
                        self._receiptEnv = order.getOrderReceiptEnv();
                        if (orders[0].is_credit_sale && self._receiptEnv && self._receiptEnv.receipt) {
                            self._receiptEnv.receipt.is_credit_sale = true;
                            if (orders[0].max_credit_discount && (!self._receiptEnv.receipt.potential_savings || self._receiptEnv.receipt.potential_savings === 0)) {
                                self._receiptEnv.receipt.potential_savings = orders[0].max_credit_discount;
                            }
                        }

                        self.render();
                    }
                }).catch(function (error) {
                    console.error("Error fetching cust_saleper_id:", error);
                });
            }

            get receipt() {
                const receipt = super.receipt;
                const order = this.props.order || this.env.pos.get_order();
                if (receipt && order && order.get_total_discount) {
                    receipt.total_discount = order.get_total_discount();
                }
                return receipt;
            }
        };

    Registries.Component.extend(OrderReceipt, PosResOrderReceipt);

    return { PosTicketOrder, PosResOrderReceipt };
});
