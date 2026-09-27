odoo.define('loyalty_bundle_pricing.ProductScreen', function (require) {
    'use strict';

    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');

    const PosLoyaltyBundlePricingProductScreen = (ProductScreen) => class extends ProductScreen {
        async _onClickPay() {
            const order = this.env.pos.get_order();
            if (order && order.cleanInvalidRewardLinesSync) {
                order.cleanInvalidRewardLinesSync();
            } else if (order && order.cleanInvalidRewardLines) {
                await order.cleanInvalidRewardLines();
            }
            return super._onClickPay(...arguments);
        }

        async _showDecreaseQuantityPopup() {
            const result = await super._showDecreaseQuantityPopup(...arguments);
            const order = this.env.pos.get_order();
            if (order && order.cleanInvalidRewardLinesSync) {
                order.cleanInvalidRewardLinesSync();
            } else if (order && order.cleanInvalidRewardLines) {
                await order.cleanInvalidRewardLines();
            }
            return result;
        }

        _setValue(val) {
            super._setValue(val);
            const order = this.env.pos.get_order();
            if (order) {
                if (order.cleanInvalidRewardLinesSync) {
                    order.cleanInvalidRewardLinesSync();
                } else if (order.cleanInvalidRewardLines) {
                    order.cleanInvalidRewardLines();
                }
            }
        }
    };

    Registries.Component.extend(ProductScreen, PosLoyaltyBundlePricingProductScreen);
    return PosLoyaltyBundlePricingProductScreen;
});
