odoo.define('pos_customer_screen.RightWidget', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { useRef } = owl;

    class RightWidget extends PosComponent {
        setup() {
            super.setup();
            this.sliderRef = useRef('Slider');
        }
    }
    RightWidget.template = 'RightWidget';

    Registries.Component.add(RightWidget);

    return RightWidget;
});
