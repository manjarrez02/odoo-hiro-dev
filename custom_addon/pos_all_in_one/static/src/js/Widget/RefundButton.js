odoo.define('point_of_sale.RefundButton', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require("@web/core/utils/hooks");

    class RefundButton extends PosComponent {
        setup() {
            super.setup();
            var self = this;
            useListener('click', this._onClick);  
        }
        _onClick() {
            const partner = this.env.pos.get_order().get_partner();
            const searchDetails = partner ? { fieldName: 'PARTNER', searchTerm: partner.name } : {};
            this.showScreen('TicketScreen', {
                ui: { filter: 'SYNCED', searchDetails },
                destinationOrder: this.env.pos.get_order(),
            });
        }
    }
    RefundButton.template = 'point_of_sale.RefundButton';

    ProductScreen.addControlButton({
        component: RefundButton,
        condition: function () {
            if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_refund){
                return true;
            }else if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_refund){
                return true;
            }
        },
    });

    Registries.Component.add(RefundButton);

    return RefundButton;
});
