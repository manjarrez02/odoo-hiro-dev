odoo.define('pos_session_close_access.pos_user_access', function (require) {
"use strict";

const HeaderButton = require('point_of_sale.HeaderButton');
const Registries = require('point_of_sale.Registries');

const { PosGlobalState } = require('point_of_sale.models');


const PosUserAccessHeaderButton = (HeaderButton) =>
    class extends HeaderButton {
        onClick() {
            var user = this.env.pos.user;
            if (!user.pos_session_access_close) {
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Access Denied'),
                    body: this.env._t('You do not have access to close a POS'),
                });
            } else {
                super.onClick();
            }
        }
    };
Registries.Component.extend(HeaderButton, PosUserAccessHeaderButton);

});
