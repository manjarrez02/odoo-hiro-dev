odoo.define('pos_all_in_one.OrderSummaryExtended', function(require){
	'use strict';

	const OrderSummary = require('point_of_sale.OrderSummary');
	const PosComponent = require('point_of_sale.PosComponent');
	const Registries = require('point_of_sale.Registries');
	const { Component } = owl;
    const { float_is_zero } = require('web.utils');

	const OrderSummaryExtended = (OrderSummary) => class extends OrderSummary {
        setup() {
            super.setup();
        }

        get partner(){
                let order = this.env.pos.get_order();
                return order.get_partner();
            }
        
        get subtotal(){
            let order = this.env.pos.get_order();
            return order.get_subtotal();
        }
        get total(){

            let total = this.props.order.get_total_with_tax()

            return total;
        }

        get customer_discount(){
            let total = this.props.order.get_subtotal()

            let customer_discount = 0;
            let order = this.props.order
            if(order.partner){
                let disc_value = order.partner.customer_discount
                if(disc_value){
                    if(order.orderlines.length > 0){
                        customer_discount = (total*disc_value)/100
                    }
                }
            }
            return customer_discount;
        }
        
        get taxes() {
            const total = this.props.order.get_total_with_tax();
            const totalWithoutTax = this.props.order.get_total_without_tax();
            const taxAmount = total - totalWithoutTax;

            let value = {
                hasTax: !float_is_zero(taxAmount, this.env.pos.currency.decimal_places),
                displayAmount: this.env.pos.format_currency(taxAmount),
            };
            return value;
        }
	};
	Registries.Component.extend(OrderSummary, OrderSummaryExtended);
	return OrderSummary;
});