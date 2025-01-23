odoo.define('x_pos_custom_view.x_ChromeCustom', function (require) {
    'use strict';

    const Chrome = require('point_of_sale.Chrome');
    const Registries = require('point_of_sale.Registries');

    const ChromeCustom = (Chrome) =>
        class extends Chrome {

            setup() {
				super.setup();
			}
            
            _onBeforeUnload() {
                this.env.pos.toRefundLines = {};
                this.env.pos.db.save('TO_REFUND_LINES', this.env.pos.toRefundLines);
            }
        };

    Registries.Component.extend(Chrome, ChromeCustom);
});
