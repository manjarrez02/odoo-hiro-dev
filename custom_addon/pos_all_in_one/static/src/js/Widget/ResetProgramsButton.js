/** @odoo-module **/

import PosComponent from 'point_of_sale.PosComponent';
import ProductScreen from 'point_of_sale.ProductScreen';
import Registries from 'point_of_sale.Registries';
import { useListener } from "@web/core/utils/hooks";

export class ResetProgramsButton extends PosComponent {
    setup() {
        super.setup();
        useListener('click', this.onClick);
    }

    async onClick() {
        this.env.pos.get_order()._resetPrograms();
    }
}

ResetProgramsButton.template = 'ResetProgramsButton';

ProductScreen.addControlButton({
    component: ResetProgramsButton,
    condition: function () {
        if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_reset_programs){
            return this.env.pos.programs.some(p => ['coupons', 'promotion'].includes(p.program_type));
        }
        if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_reset_programs){
            return this.env.pos.programs.some(p => ['coupons', 'promotion'].includes(p.program_type));
        }
    }
});

Registries.Component.add(ResetProgramsButton);
