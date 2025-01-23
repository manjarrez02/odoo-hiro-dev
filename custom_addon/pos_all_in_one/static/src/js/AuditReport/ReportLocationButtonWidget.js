
odoo.define('pos_all_in_one.ReportLocationButtonWidget', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const { useListener } = require("@web/core/utils/hooks");
    let core = require('web.core');
    let _t = core._t;
    const Registries = require('point_of_sale.Registries');


    class ReportLocationButtonWidget extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this.onClick);
        }
            
        async onClick(){
            var self = this;
            self.showPopup('PopupLocationWidget',{
                'title': 'Audit Report',
            });
        }
    }

    ReportLocationButtonWidget.template = 'ReportLocationButtonWidget';
    ProductScreen.addControlButton({
        component: ReportLocationButtonWidget,
        condition: function() {
            if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_loc_summery){
                if(this.env.pos.config.loc_summery){
                    return true
                }else{
                    return true
                }
            }
            if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_loc_summery){
                if(this.env.pos.config.loc_summery){
                    return true
                }else{
                    return true
                }
            }
        },
    });
    Registries.Component.add(ReportLocationButtonWidget);
    return ReportLocationButtonWidget;
});