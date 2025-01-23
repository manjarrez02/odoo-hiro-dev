odoo.define('pos_all_in_one.BiErrorPopup', function(require) {
    'use strict';

    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    const { _lt } = require('@web/core/l10n/translation');

    class BiErrorPopup extends AbstractAwaitablePopup {
        setup() {
            super.setup();
            owl.onMounted(this.onMounted);
        }
        onMounted() {
            this.playSound('error');
        }

        cancel() {
            this.env.posbus.trigger('close-popup', {
                popupId: this.props.id,
                response: { confirmed: false, payload: null },
            });
        }
    }
    BiErrorPopup.template = 'BiErrorPopup';
    BiErrorPopup.defaultProps = {
        cancelText: _lt('Cancel'),
        confirmText: _lt('Ok'),
        title: _lt('Error'),
        body: '',
        cancelKey: false,
    };

    Registries.Component.add(BiErrorPopup);

    return BiErrorPopup;
});
