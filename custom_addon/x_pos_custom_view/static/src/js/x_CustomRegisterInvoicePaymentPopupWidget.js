odoo.define('x_pos_custom_view.CustomRegisterInvoicePaymentPopupWidget', function(require) {
    'use strict';

    const RegisterInvoicePaymentPopupWidget = require('pos_all_in_one.RegisterInvoicePaymentPopupWidget');
    const Registries = require('point_of_sale.Registries');
    const rpc = require('web.rpc');
	let core = require('web.core');
	let _t = core._t;

    const CustomRegisterInvoicePaymentPopupWidget = RegisterInvoicePaymentPopupWidget =>
        class extends RegisterInvoicePaymentPopupWidget {
            setup() {
                super.setup(); 
                this.payment_methods_from_config = this.env.pos.payment_methods.filter(method => this.env.pos.config.payment_method_ids.includes(method.id));                
            }

            async register_payment() {
                var self = this;
                var invoice = this.invoice;
                var partner = invoice.partner_id[0];
                var payment_type = $('#payment_type1').val();
                var entered_amount = ($("#entered_amount1").val()).replace(",", "");
                var entered_note = $("#entered_note1").val();
                var rpc_result = false;

                var journal = this.env.pos.journals.find(({ id }) => id === Number(payment_type));
                var partner_ = this.env.pos.partners.find(({ id }) => id === Number(partner));

                if (isNaN(entered_amount)) {
                    await this.showPopup('ErrorPopup', {
                        title: this.env._t('Unknown'),
                        body: "Ingrese valor válido.",
                    });
                    return;   
                }

                if(journal.wallet_journal){                
                    var wallet_balance = partner_.wallet_balance;
                    // Verificar si el total de los pagos supera el balance de la billetera
                    if (wallet_balance < entered_amount) {
                        await this.showPopup('ErrorPopup', {
                            title: this.env._t('Saldo insuficiente en la e-wallet.'),
                            body: "Saldo insuficiente en la e-wallet.",
                        });
                        return;                
                    }            
                }                
                
                if (invoice['amount_residual'] >= entered_amount){
                    var session_id = this.env.pos.config.current_session_id[0];
                    var default_customer = this.env.pos.config.res_partner_id;
	                var default_customer_by_id = this.env.pos.db.get_partner_by_id(default_customer[0]);
                    if(default_customer_by_id){
                        this.env.pos.get_order().set_partner(default_customer_by_id);
                    } else{
                        this.env.pos.get_order().set_partner(null);
                    }

                    if(journal.wallet_journal){
                        var price = parseFloat(entered_amount);                        
                        var session = this.env.pos.config.current_session_id[1];
                        var currency_id = this.env.pos.company.currency_id[1];
                        var order_partner = partner_;
                        var order_name = invoice['name'];
                        var balance = parseFloat(wallet_balance - price);                                                                   
                        rpc.query({
                            model: 'res.partner',
                            method: 'write_value',
                            args: [balance, order_partner, order_name, price, currency_id],
                        });
                    }
                    rpc_result = rpc.query({
                        model: 'pos.create.customer.payment',
                        method: 'create_customer_payment_inv',
                        args: [partner ? partner : 0, partner ? partner : 0, payment_type, entered_amount, invoice, entered_note,session_id],
                        
                    }).then(function(output) {
                         rpc.query({
                            model: 'res.partner',
                            method: 'update_partner_credit_amount',
                            args: [partner, entered_amount],
                        });
                        
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
    
                    
                }                
                else{
                    self.showPopup('ErrorPopup', {
                        'title': _t('Amount Error'),
                        'body': _t('Entered amount is larger then due amount. please enter valid amount'),
                    });
                }
    
            }

        };

    Registries.Component.extend(RegisterInvoicePaymentPopupWidget, CustomRegisterInvoicePaymentPopupWidget);

    return CustomRegisterInvoicePaymentPopupWidget;
});
