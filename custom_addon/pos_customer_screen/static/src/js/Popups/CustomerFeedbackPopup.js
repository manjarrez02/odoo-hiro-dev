odoo.define('pos_customer_screen.CustomerFeedbackPopup', function(require) {
    'use strict';

    const { useState } = owl;
    const { useListener } = require("@web/core/utils/hooks");
    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');


    class CustomerFeedbackPopup extends AbstractAwaitablePopup {
        setup(){
            super.setup();
            useListener('change-ratings',this._changeRatings)
            this.state = useState({'currentRating': 0,})
        }
        _changeRatings(event){
            this.state.currentRating = event.detail.value
        }
        getPayload(){
            return this.state.currentRating;
        }
    }
    CustomerFeedbackPopup.template = 'CustomerFeedbackPopup';

    Registries.Component.add(CustomerFeedbackPopup);

    return {
        CustomerFeedbackPopup,
    };
});
