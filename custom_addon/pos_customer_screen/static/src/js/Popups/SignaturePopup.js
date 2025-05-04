odoo.define('pos_customer_screen.SignaturePopup', function(require) {
    'use strict';

    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    const { _lt } = require('@web/core/l10n/translation');
    const { onMounted } = owl;

    class SignaturePopup extends AbstractAwaitablePopup {
        setup(){
            super.setup();
            onMounted(() => {
                $('#signature').jSignature({ lineWidth: 1, width: 565, height: 215 });
                if(this.order && this.order.get_raw_sign()){
                    let signData = this.order.get_raw_sign();
                    $('#signature').jSignature('setData', 'data:' + signData.join(','));
                }
            });
        }
        getPayload(){
            return {'base30': $("#signature").jSignature("getData", "base30"),
                    'base64':$("#signature").jSignature("getData", "image")};
        }
        clear(){
            if(this.order){
                this.order.set_sign(null);
                this.order.get_raw_sign(null);
            }
            $("#signature").jSignature("reset");
        }
    }

    SignaturePopup.template = 'SignaturePopup';

    SignaturePopup.defaultProps = {
        confirmText: _lt('Apply'),
        cancelText: _lt('Cancel'),
        title: '',
        body: '',
    };

    Registries.Component.add(SignaturePopup);

    return SignaturePopup;
});
