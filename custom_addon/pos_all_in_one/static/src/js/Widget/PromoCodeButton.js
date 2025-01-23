/** @odoo-module **/

import PosComponent from 'point_of_sale.PosComponent';
import ProductScreen from 'point_of_sale.ProductScreen';
import Registries from 'point_of_sale.Registries';
import { useListener } from "@web/core/utils/hooks";

export class PromoCodeButton extends PosComponent {
    setup() {
        super.setup();
        useListener('click', this.onClick);
    }

    async onClick() {
        let { confirmed, payload: code } = await this.showPopup('TextInputPopup', {
            title: this.env._t('Enter Code'),
            startingValue: '',
            placeholder: this.env._t('Gift card or Discount code'),
        });
        if (confirmed) {
            code = code.trim();
            if (code !== '') {
                this.env.pos.get_order().activateCode(code);
            }
        }
    }
}

PromoCodeButton.template = 'PromoCodeButton';

ProductScreen.addControlButton({
    component: PromoCodeButton,
    condition: function () {
        if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_enter_code){
            return this.env.pos.programs.some(p => ['coupons', 'promotion', 'gift_card', 'promo_code', 'next_order_coupons'].includes(p.program_type));
        }
        if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_enter_code){
            return this.env.pos.programs.some(p => ['coupons', 'promotion', 'gift_card', 'promo_code', 'next_order_coupons'].includes(p.program_type));
        }
    }
});

Registries.Component.add(PromoCodeButton);
