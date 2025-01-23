odoo.define('pos_customer_wallet_management.CustomRegisterInvoicePaymentPopupWidget', function(require) {
    'use strict';

    const RegisterInvoicePaymentPopupWidget = require('pos_all_in_one.RegisterInvoicePaymentPopupWidget');
    const Registries = require('point_of_sale.Registries');

    const CustomRegisterInvoicePaymentPopupWidget = (RegisterInvoicePaymentPopupWidget) =>
        class extends RegisterInvoicePaymentPopupWidget {
            async register_payment() {
                var self = this;
                var invoice = this.invoice;
                var partner = invoice.partner_id[0];
                var payment_type = $('#payment_type1').val();

                var entered_amount = parseFloat(($("#entered_amount1").val()).replace(/,/g, ""));
                var entered_note = $("#entered_note1").val();
                let rpc_result = false;

                /**
                 *  Verificar saldo de wallet utilizado
                 */

                var totalWalletPayment = entered_amount;
                var wallet_balance = this.env.pos.selectedOrder.partner.wallet_balance;
                let wallet_balance_rounded = parseFloat(wallet_balance.toFixed(2));
                let totalWalletPayment_rounded = parseFloat(totalWalletPayment.toFixed(2));                            
                
                if (!isNaN(entered_amount)){
                    await this.showPopup('ErrorPopup', {
                        title: this.env._t('Unknown'),
                        body: "Ingrese un valor válido.",
                    });
                    return; 
                }


                // Verificar si el total de los pagos supera el balance de la billetera
                if (wallet_balance_rounded < totalWalletPayment_rounded) {   
                    await this.showPopup('ErrorPopup', {
                        title: this.env._t('Saldo Insuficiente'),
                        body: "Saldo insuficiente en la e-wallet",
                    });
                    return; // Detener la validación si el balance es insuficiente
                }
    
                if (invoice['amount_residual'] > entered_amount){
                    rpc_result = rpc.query({
                        model: 'pos.create.customer.payment',
                        method: 'create_customer_payment_inv',
                        args: [partner ? partner : 0, partner ? partner : 0, payment_type, entered_amount, invoice, entered_note],
                        
                    }).then(function(output) {
                         rpc.query({
                            model: 'res.partner',
                            method: 'update_partner_credit_amount',
                            args: [partner, entered_amount],
                        });
                        alert('Payment has been Registered for this Invoice !!!!');
                        self.cancel()
                        self.showTempScreen('RegisterInvoicePaymentRecipetScreen',{
                            partner_id : output.partner,
                            order_ref : invoice.ref,
                            invoice_ref : invoice.name,
                            payment_type : output.payment_type,
                            amount: entered_amount,
                            invoice: output.payment_journal,
                            note: entered_note,
                        });
                    });
    
                    
                }else{
                    self.showPopup('ErrorPopup', {
                        'title': _t('Amount Error'),
                        'body': _t('Entered amount is larger then due amount. please enter valid amount'),
                    });
                }    
            }
        };

    Registries.Component.extend(RegisterInvoicePaymentPopupWidget, CustomRegisterInvoicePaymentPopupWidget);

});
