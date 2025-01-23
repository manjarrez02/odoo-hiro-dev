odoo.define('x_pos_custom_view.x_PosGlobalStateCustom', function (require) {
    'use strict';

    const PosGlobalState = require('point_of_sale.PosGlobalState');
    const Registries = require('point_of_sale.Registries');

    const PosGlobalStateCustom = (PosGlobalState) =>
        class extends PosGlobalState {
            
            setup() {
				super.setup();
			}

            removeOrder(order) {
                this.orders.remove(order);
                this.db.remove_unpaid_order(order);
                for (const line of order.get_orderlines()) {
                    if (line.refunded_orderline_id) {
                        delete this.toRefundLines[line.refunded_orderline_id];
                    }
                }
                this.env.pos.toRefundLines = {};
            }
        };

    Registries.Model.extend(PosGlobalState, PosGlobalStateCustom);

});
