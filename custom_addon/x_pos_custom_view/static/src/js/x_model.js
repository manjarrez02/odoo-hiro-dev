odoo.define('my_pos_extension.custom_pos', function (require) {
    "use strict";

    const { PosGlobalState, Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    // ─── Extensión de PosGlobalState ────────────────────────────────────────────
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
            if (cashControl && defaultCashDetails) {
                state.payments[defaultCashDetails.id] = {counted: 0, difference: -defaultCashDetails.amount, number: 0};
            }
            if (otherPaymentMethods.length > 0) {
                otherPaymentMethods.forEach(pm => {
                    if (pm.type === 'bank') {
                        state.payments[pm.id] = {counted: this.round_decimals_currency(pm.amount), difference: 0, number: pm.number};
                    }
                });
            }

            return {
                ordersDetails, paymentsAmount, payLaterAmount, invoicePaymentsByJournal, openingNotes, defaultCashDetails, otherPaymentMethods,
                isManager, amountAuthorizedDiff, state, cashControl
            };
        }
    };

    Registries.Model.extend(PosGlobalState, CustomPosGlobalState);

    // ─── Extensión de Order: toggle de venta a crédito ──────────────────────────
    /**
     * isCreditSale (Boolean, por defecto false)
     *   Cuando es true, ninguna línea nueva recibe customer_discount y todas
     *   las líneas existentes con allow_discount tienen descuento = 0.
     *   El flag se serializa en el JSON de la orden para persistir en pedidos
     *   guardados (draft) y se resetea al cambiar de cliente.
     */
    const CreditSaleOrder = (Order) => class extends Order {

        setup(attributes, options) {
            super.setup(attributes, options);
            // Inicializar en false; se sobreescribe en init_from_JSON si procede.
            this.isCreditSale = this.isCreditSale || false;
        }

        /**
         * Sobrescribe set_partner para reiniciar isCreditSale si cambia de cliente
         * o si el nuevo cliente no tiene crédito autorizado (allow_over_limit).
         */
        set_partner(partner) {
            const oldPartner = this.get_partner();
            super.set_partner(partner);
            const oldId = oldPartner ? oldPartner.id : false;
            const newId = partner ? partner.id : false;

            if (oldId !== newId || !partner || !partner.allow_over_limit) {
                this.isCreditSale = false;
            }
        }

        /**
         * Alterna el flag isCreditSale y ajusta los descuentos de todas las
         * líneas con allow_discount en consecuencia.
         */
        toggleCreditSale() {
            const partner = this.get_partner();
            if (!partner || !partner.allow_over_limit) {
                this.isCreditSale = false;
                return;
            }
            this.isCreditSale = !this.isCreditSale;
            this.get_orderlines().forEach(line => {
                if (line.product && line.product.allow_discount) {
                    if (this.isCreditSale) {
                        // Modo crédito: limpiar descuento
                        line.set_discount(0);
                    } else {
                        // Modo normal: restaurar customer_discount si aplica
                        if (partner && partner.customer_discount) {
                            line.set_discount(partner.customer_discount);
                        } else {
                            line.set_discount(0);
                        }
                    }
                }
            });

            // Actualización inmediata de Customer Screen
            if (this.pos && this.pos.config && this.pos.config.customer_display && typeof this.mirror_image_data === 'function') {
                this.mirror_image_data();
            }
        }

        /**
         * Serialización: incluir isCreditSale en el JSON de la orden
         * para que persista en pedidos guardados (draft).
         */
        export_as_JSON() {
            const json = super.export_as_JSON();
            json.is_credit_sale = this.isCreditSale || false;
            return json;
        }

        /**
         * Deserialización: restaurar isCreditSale al reimportar un pedido.
         */
        init_from_JSON(json) {
            super.init_from_JSON(json);
            this.isCreditSale = json.is_credit_sale || false;
        }

        /**
         * Incluir datos de venta a crédito y ahorro potencial en el objeto receipt
         * para la impresión del ticket regular.
         */
        export_for_printing() {
            const receipt = super.export_for_printing();
            receipt.is_credit_sale = this.isCreditSale || false;
            receipt.potential_savings = 0;

            const partner = this.get_partner();
            if (this.isCreditSale && partner && partner.customer_discount > 0) {
                const discRate = partner.customer_discount / 100;
                let potentialSavings = 0;
                this.get_orderlines().forEach(line => {
                    if (line.product && line.product.allow_discount) {
                        potentialSavings += line.get_price_with_tax() * discRate;
                    }
                });
                receipt.potential_savings = potentialSavings;
            }
            return receipt;
        }
    };

    Registries.Model.extend(Order, CreditSaleOrder);

    return { CustomPosGlobalState, CreditSaleOrder };
});
