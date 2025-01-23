odoo.define('pos_customer_wallet_management.payment_method', function (require) {
"use strict";
const Registries = require('point_of_sale.Registries');
const PaymentScreen = require('point_of_sale.PaymentScreen');
const { browser } = require("@web/core/browser/browser");

const payment_method = (PaymentScreen) =>
  class extends PaymentScreen {
       /**
         *Override PaymentScreen
       */
    async addNewPaymentLine({ detail: paymentMethod }) {

              const orders = this.payment_method;
              var order = this.env.pos.selectedOrder.partner;
              var select = this.env.pos.selectedOrder.selected_orderline;
              var payment = this.env.pos.selectedOrder.selected_paymentline;
                  if (order == null) {
                       await this.showPopup('ErrorPopup', {
                            title: this.env._t('Unknown'),
                            body: "Seleccione Cliente Primero",
                        });
                  }
                  else if (select == null) {
                       await this.showPopup('ErrorPopup', {
                                title: this.env._t('Product'),
                                body: "Seleccione Producto Primero",
                       });
                  }
                  else {
                         return super.addNewPaymentLine({ detail: paymentMethod });
                  }
   }

/**

   async validateOrder(isForceValidate) {
                 /**
                    *Override Validate order button
                 
                  var payment = this.env.pos.selectedOrder.paymentlines;                  
                     for (const orderLine of payment) {                        
                         if (orderLine.payment_method.wallet_journal) {
                            var price = orderLine.amount;
                            var session = this.env.pos.config.current_session_id[1];
                            var currency_id = this.env.pos.company.currency_id[1];
                            var order = this.env.pos.selectedOrder.partner;
                            var wallet_balance = this.env.pos.selectedOrder.partner.wallet_balance;
                            var quantity = this.env.pos.selectedOrder.selected_orderline.quantity;
                            var balance = wallet_balance - price;
                                if (wallet_balance < price) {
                                    await this.showPopup('ErrorPopup', {
                                        title: this.env._t('Unknown'),
                                        body: "Not enough wallet balance",
                                    });
                                    return
                                } else {
                                        var rpc = require('web.rpc');
                                        var self = this;
                                        rpc.query({
                                            model: 'res.partner',
                                            method: 'write_value',
                                            args: [balance, order, session, price, currency_id],
                                        });
                         }
               
                               
                         }
                     }
                     return super.validateOrder(isForceValidate);
   }

**/

    async validateOrder(isForceValidate) {
        /**
         * Override Validate order button
         */
        var payment = this.env.pos.selectedOrder.paymentlines;
        var totalWalletPayment = payment
            .filter(orderLine => orderLine.payment_method.wallet_journal) // Filtrar los pagos con wallet_journal
            .reduce((total, orderLine) => total + orderLine.amount, 0); // Sumatoria de los montos de pago
        var wallet_balance = this.env.pos.selectedOrder.partner.wallet_balance;
        let wallet_balance_rounded = parseFloat(wallet_balance.toFixed(2));
        let totalWalletPayment_rounded = parseFloat(totalWalletPayment.toFixed(2));
       
        // Verificar si el total de los pagos supera el balance de la billetera
        if (wallet_balance_rounded < totalWalletPayment_rounded) {
            await this.showPopup('ErrorPopup', {
                title: this.env._t('Saldo Insuficiente'),
                body: "Saldo insuficiente en la e-wallet.",
            });
            return; // Detener la validación si el balance es insuficiente
        }

        // Verificar si existe el método de pago en efectivo (cash)
        var cashPayments = payment.filter(orderLine => orderLine.payment_method.type === "cash");
        var nonCashPayments = payment.filter(orderLine => orderLine.payment_method.type !== "cash");
        var totalPayments = payment.reduce((total, orderLine) => total + orderLine.amount, 0); // Sumar todos los pagos
        var orderTotal = this.env.pos.get_order().get_total_with_tax();

        var roundedTotalPayments = parseFloat(totalPayments.toFixed(2));
        var roundedOrderTotal = parseFloat(orderTotal.toFixed(2));      

        // Si hay pago en efectivo y otros métodos, el pago debe ser exacto
        if ((cashPayments.length > 0 && payment.length > 1 && roundedTotalPayments !== roundedOrderTotal) || 
            (nonCashPayments.length > 0 && roundedTotalPayments !== roundedOrderTotal)) {
            await this.showPopup('ErrorPopup', {
                title: this.env._t('Pago Exacto Requerido'),
                body: "Cuando se utiliza un método de pago distinto al efectivo, el monto total debe ser exacto.",
            });
            return; // Detener la validación si el pago no es exacto
        }

        // Si el balance es suficiente, continuar con la actualización
        for (const orderLine of payment) {            
            if (orderLine.payment_method.wallet_journal) {
                var price = orderLine.amount;
                var session = this.env.pos.config.current_session_id[1];
                var currency_id = this.env.pos.company.currency_id[1];
                var order = this.env.pos.selectedOrder.partner;

                var balance = wallet_balance - price;

                var rpc = require('web.rpc');
                rpc.query({
                    model: 'res.partner',
                    method: 'write_value',
                    args: [balance, order, session, price, currency_id],
                });
            }
        }
        this.env.pos.toRefundLines = {}; //Auxiliar para eliminar información de reembolsos en curso
        return super.validateOrder(isForceValidate);
    }


// Lo siguiente es para agregar la validación cuando se utiliza el pago parcial de pos_all_in_one (crédito)

    async clickPayLater(){
        let self = this;
        let order = self.env.pos.get_order();
        var payment = this.env.pos.selectedOrder.paymentlines;

        // Verificar si requiere pago parcial
        var totalPayments = payment.reduce((total, orderLine) => total + orderLine.amount, 0); // Sumar todos los pagos
        var orderTotal = this.env.pos.get_order().get_total_with_tax();
    
        if (totalPayments >= orderTotal) {
            await this.showPopup('ErrorPopup', {
                title: this.env._t('Orden Pagada'),
                body: "La orden está completamente pagada. Seleccione Validar.",
            });
            return; // Detener la validación si el pago no es exacto
        }

        /**
         *  Verificar saldo de wallet utilizado
         */
        var totalWalletPayment = payment
            .filter(orderLine => orderLine.payment_method.wallet_journal) // Filtrar los pagos con wallet_journal
            .reduce((total, orderLine) => total + orderLine.amount, 0); // Sumatoria de los montos de pago
        var wallet_balance = this.env.pos.selectedOrder.partner.wallet_balance;
        
        // Verificar si el total de los pagos supera el balance de la billetera
        if (wallet_balance < totalWalletPayment) {
            await this.showPopup('ErrorPopup', {
                title: this.env._t('Unknown'),
                body: "Saldo insuficiente en la e-wallet.",
            });
            return; // Detener la validación si el balance es insuficiente
        }

        let check = await this.check_partical_payment();            

                
        if(check){
            order.is_partial = true;
            order.amount_due = order.get_due();
            order.set_is_partial(true);
            order.to_invoice = true;
            order.finalized = false;
            var rpc = require('web.rpc');
            for (const orderLine of payment) {            
                if (orderLine.payment_method.wallet_journal) {
                    var price = orderLine.amount;
                    var session = this.env.pos.config.current_session_id[1];
                    var currency_id = this.env.pos.company.currency_id[1];
                    var order_partner = this.env.pos.selectedOrder.partner;
                    var balance = wallet_balance - price;
    
                    var rpc = require('web.rpc');
                    rpc.query({
                        model: 'res.partner',
                        method: 'write_value',
                        args: [balance, order_partner, session, price, currency_id],
                    });
                }
            }
            var isForceValidate = false;
            this.env.pos.toRefundLines = {}; //Auxiliar para eliminar información de reembolsos en curso
            return super._finalizeValidation();            
        }
    }

}
  Registries.Component.extend(PaymentScreen, payment_method);
});
