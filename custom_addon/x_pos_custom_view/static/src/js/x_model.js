odoo.define('my_pos_extension.custom_pos', function (require) {
    "use strict";

    const PosGlobalState = require('point_of_sale.models').PosGlobalState;
    const Registries = require('point_of_sale.Registries');

    // Extiende PosGlobalState
    const CustomPosGlobalState = (PosGlobalState) => class extends PosGlobalState {

        setup() {
            super.setup();
        }


        async getClosePosInfo() {
            const closingData = await this.env.services.rpc({
                model: 'pos.session',
                method: 'get_closing_control_data',
                args: [[this.pos_session.id]]
            });

            // Inicializar payment_amount en default_cash_details
            if (closingData.default_cash_details) {
                const journalId = closingData.default_cash_details.journal_id;
                const matchingInvoicePayments = closingData.invoice_payments_by_journal.filter(invoice => invoice.journal_id === journalId);
                const totalMatchingAmount = matchingInvoicePayments.reduce((sum, invoice) => sum + invoice.amount, 0);
                closingData.default_cash_details.payment_amount += totalMatchingAmount;
                closingData.default_cash_details.amount += totalMatchingAmount;
            }

            // Sumar los amounts a otherPaymentMethods
            if (closingData.other_payment_methods) {
                closingData.other_payment_methods.forEach(paymentMethod => {
                    // Filtrar los pagos que coinciden con el journal_id del método de pago
                    const matchingInvoicePayments = closingData.invoice_payments_by_journal.filter(
                        invoice => invoice.journal_id === paymentMethod.journal_id // Suponiendo que el ID del método de pago coincide con el journal_id
                    );

                    // Sumar todos los amounts de las coincidencias
                    const totalMatchingAmount = matchingInvoicePayments.reduce((sum, invoice) => sum + invoice.amount, 0);

                    // Actualizar payment_amount
                    paymentMethod.amount = (paymentMethod.amount || 0) + totalMatchingAmount;
                });
            }

            const ordersDetails = closingData.orders_details;
            const paymentsAmount = closingData.payments_amount;
            const payLaterAmount = closingData.pay_later_amount;
            const invoicePaymentsByJournal = closingData.invoice_payments_by_journal;
            const openingNotes = closingData.opening_notes;
            const defaultCashDetails = closingData.default_cash_details;
            const otherPaymentMethods = closingData.other_payment_methods;
            const isManager = closingData.is_manager;
            const amountAuthorizedDiff = closingData.amount_authorized_diff;
            const cashControl = this.config.cash_control;
    
            // component state and refs definition
            const state = {notes: '', acceptClosing: false, payments: {}};
            if (cashControl) {
                state.payments[defaultCashDetails.id] = {counted: 0, difference: -defaultCashDetails.amount, number: 0};
            }
            if (otherPaymentMethods.length > 0) {
                otherPaymentMethods.forEach(pm => {
                    if (pm.type === 'bank') {
                        state.payments[pm.id] = {counted: this.round_decimals_currency(pm.amount), difference: 0, number: pm.number}
                    }
                })
            }

            return {
                ordersDetails, paymentsAmount, payLaterAmount, invoicePaymentsByJournal, openingNotes, defaultCashDetails, otherPaymentMethods,
                isManager, amountAuthorizedDiff, state, cashControl
            }
        }
    }

    Registries.Model.extend(PosGlobalState, CustomPosGlobalState);

    return CustomPosGlobalState;
});
