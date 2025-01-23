odoo.define('pos_orders_all.GiftCouponButton', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const { useListener } = require("@web/core/utils/hooks");
    const Registries = require('point_of_sale.Registries');

    class GiftCouponButton extends PosComponent {
        setup() {
            super.setup();
            var self = this;
            // if(!self.env.pos.config.module_pos_hr && self.env.pos.user.is_allow_coupon){
            //     useListener('click', this.onClick);
            // }
            // if(self.env.pos.config.module_pos_hr && self.env.pos.cashier.is_allow_coupon){
            // }
            useListener('click', this.onClick);
        }

        async onClick() {
            this.showPopup('CouponConfigPopup',{});
        }
    }
    GiftCouponButton.template = 'GiftCouponButton';


    ProductScreen.addControlButton({
        component: GiftCouponButton,
        condition: function () {
            if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_coupon){
                return true;
            }else if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_coupon){
                return true;
            }
        },
    });

    Registries.Component.add(GiftCouponButton);
    return GiftCouponButton;
});
