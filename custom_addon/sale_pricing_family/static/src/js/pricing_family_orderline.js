odoo.define('sale_pricing_family.pricing_family_orderline', function (require) {
    "use strict";

    const { Orderline } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var utils = require('web.utils');
    var { Gui } = require('point_of_sale.Gui');

    var _t = core._t;
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;

    const PricingFamilyOrderline = (Orderline) => class PricingFamilyOrderline extends Orderline {

        getPricingFamilyId() {
            const family = this.product && this.product.pricing_family_id;
            if (Array.isArray(family)) {
                return family[0];
            }
            return family || false;
        }

        getEffectivePricingQty() {
            if (this.order && this.order.getLineEffectiveQty) {
                return this.order.getLineEffectiveQty(this);
            }
            return this.get_quantity() || 0;
        }

        set_quantity(quantity, keep_price) {
            this.order.assert_editable();

            if (quantity === 'remove') {
                const familyId = this.getPricingFamilyId();

                if (this.refunded_orderline_id in this.pos.toRefundLines) {
                    delete this.pos.toRefundLines[this.refunded_orderline_id];
                }

                this.order.remove_orderline(this);

                if (familyId && this.order.recomputeFamilyPrices) {
                    this.order.recomputeFamilyPrices(familyId);
                }

                return true;
            } else {
                var quant = typeof(quantity) === 'number'
                    ? quantity
                    : field_utils.parse.float('' + (quantity ? quantity : 0));

                if (this.refunded_orderline_id in this.pos.toRefundLines) {
                    const toRefundDetail = this.pos.toRefundLines[this.refunded_orderline_id];
                    const maxQtyToRefund = toRefundDetail.orderline.qty - toRefundDetail.orderline.refundedQty;

                    if (quant > 0) {
                        Gui.showPopup('ErrorPopup', {
                            title: _t('Positive quantity not allowed'),
                            body: _t('Only a negative quantity is allowed for this refund line. Click on +/- to modify the quantity to be refunded.')
                        });
                        return false;
                    } else if (quant == 0) {
                        toRefundDetail.qty = 0;
                    } else if (-quant <= maxQtyToRefund) {
                        toRefundDetail.qty = -quant;
                    } else {
                        Gui.showPopup('ErrorPopup', {
                            title: _t('Greater than allowed'),
                            body: _.str.sprintf(
                                _t('The requested quantity to be refunded is higher than the refundable quantity of %s.'),
                                this.pos.formatProductQty(maxQtyToRefund)
                            ),
                        });
                        return false;
                    }
                }

                var numRefundLines = this.pos.toRefundLines
                    ? Object.keys(this.pos.toRefundLines).length
                    : 0;

                if (numRefundLines > 0 && quant > 0) {
                    quant = 0;
                }

                if (numRefundLines > 0 && quant < 0) {
                    var exists = Object.values(this.pos.toRefundLines).some(
                        item => item.orderline.productId === this.product.id
                    );

                    if (!exists) {
                        quant = 0;
                        Gui.showPopup('ErrorPopup', {
                            title: _t('Producto fuera de orden'),
                            body: _t('No puede reembolsar productos fuera de la orden')
                        });
                        return false;
                    }
                }

                var unit = this.get_unit();
                if (unit) {
                    if (unit.rounding) {
                        var decimals = this.pos.dp['Product Unit of Measure'];
                        var rounding = Math.max(unit.rounding, Math.pow(10, -decimals));
                        this.quantity = round_pr(quant, rounding);
                        this.quantityStr = field_utils.format.float(this.quantity, { digits: [69, decimals] });
                    } else {
                        this.quantity = round_pr(quant, 1);
                        this.quantityStr = this.quantity.toFixed(0);
                    }
                } else {
                    this.quantity = quant;
                    this.quantityStr = '' + this.quantity;
                }
            }

            if (!keep_price && !(this.price_manually_set || this.price_automatically_set)) {
                const familyId = this.getPricingFamilyId();

                if (familyId && this.order.recomputeFamilyPrices) {
                    this.order.recomputeFamilyPrices(familyId);
                } else {
                    this.set_unit_price(
                        this.product.get_price(
                            this.order.pricelist,
                            this.get_quantity(),
                            this.get_price_extra()
                        )
                    );
                    this.order.fix_tax_included_price(this);
                }
            }

            return true;
        }

        can_be_merged_with(orderline) {
            if (this.get_product().id !== orderline.get_product().id) {
                return false;
            } else if (!this.get_unit() || !this.get_unit().is_pos_groupable) {
                return false;
            } else if (
                this.product.tracking == 'lot' &&
                (this.pos.picking_type.use_create_lots || this.pos.picking_type.use_existing_lots)
            ) {
                return false;
            } else if (this.description !== orderline.description) {
                return false;
            } else if (orderline.get_customer_note() !== this.get_customer_note()) {
                return false;
            } else if (this.refunded_orderline_id) {
                return false;
            }

            var price = parseFloat(
                round_di(this.price || 0, this.pos.dp['Product Price'])
                    .toFixed(this.pos.dp['Product Price'])
            );

            const effectiveQty = this.order && this.order.getLineEffectiveQty
                ? this.order.getLineEffectiveQty(this)
                : this.get_quantity();

            var expectedPrice = orderline.get_product().get_price(
                orderline.order.pricelist,
                effectiveQty,
                orderline.get_price_extra()
            );

            expectedPrice = round_di(
                orderline.compute_fixed_price(expectedPrice),
                this.pos.currency.decimal_places
            );

            if (!utils.float_is_zero(
                price - expectedPrice - orderline.get_price_extra(),
                this.pos.currency.decimal_places
            )) {
                return false;
            }

            return true;
        }
    };

    Registries.Model.extend(Orderline, PricingFamilyOrderline);

    return PricingFamilyOrderline;
});