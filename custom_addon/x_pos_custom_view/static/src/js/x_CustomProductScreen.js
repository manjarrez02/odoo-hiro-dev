odoo.define('x_pos_custom_view.x_CustomProductScreen', function (require) {
    'use strict';

    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');
    var { Gui } = require('point_of_sale.Gui');
    var core = require('web.core');	
	
	var _t = core._t;

    const CustomProductScreen = (ProductScreen) => class extends ProductScreen {
        
        setup() {
            super.setup();
        }

        async _onClickPay() {

            const orderlines = this.env.pos.get_order().orderlines;
            for (let orderline of orderlines) {
                if (orderline.quantity < 0 && Object.keys(this.env.pos.toRefundLines).length === 0) {                    
					return this.showPopup('ErrorPopup', {
						title: this.env._t('No es devolución'),
						body: this.env._t('Borre la línea con cantidades negativas'),
					});          
                }
                if (orderline.quantity === 0) {
					return this.showPopup('ErrorPopup', {
						title: this.env._t('Artículo en ceros'),
						body: this.env._t('Borre la línea con cantidad en cero'),
					});          
                }
			}
            if (this.env.pos.get_order().orderlines.some(line => line.get_product().tracking !== 'none' && !line.has_valid_product_lot()) && (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots)) {
                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Some Serial/Lot Numbers are missing'),
                    body: this.env._t('You are trying to sell products with serial/lot numbers, but some of them are not set.\nWould you like to proceed anyway?'),
                    confirmText: this.env._t('Yes'),
                    cancelText: this.env._t('No')
                });
                if (confirmed) {
                    this.showScreen('PaymentScreen');
                }
            } else {
                this.showScreen('PaymentScreen');
            }
        }
    };

    Registries.Component.extend(ProductScreen, CustomProductScreen);

    return CustomProductScreen;
});