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
                super.removeOrder(...arguments);
                if (this.toRefundLines) {
                    this.toRefundLines = {};
                }
            }
        };

    Registries.Model.extend(PosGlobalState, PosGlobalStateCustom);

});
