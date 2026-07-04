odoo.define('sale_pricing_family.add_product', function (require) {
    "use strict";

    const { Order, Orderline } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    var { Gui } = require('point_of_sale.Gui');
    var core = require('web.core');

    var _t = core._t;

    const PosOrder = (Order) => class PosOrder extends Order {

        setup() {
            super.setup();
        }

        add_product(product, options) {
            options = options || {};

            if (
                this.pos.doNotAllowRefundAndSales() &&
                this._isRefundAndSaleOrder() &&
                (!options.quantity || options.quantity > 0)
            ) {
                Gui.showPopup('ErrorPopup', {
                    title: _t('Refund and Sales not allowed'),
                    body: _t('It is not allowed to mix refunds and sales')
                });
                return;
            }

            if (this._printed) {
                this.pos.removeOrder(this);
                return this.pos.add_new_order().add_product(product, options);
            }

            this.assert_editable();

            var line = Orderline.create({}, { pos: this.pos, order: this, product: product });
            this.fix_tax_included_price(line);
            this.set_orderline_options(line, options);

            var to_merge_orderline;
            for (var i = 0; i < this.orderlines.length; i++) {
                var discount_merge = true;
                var not_weight_merge = true;

                if (product.to_weight) {
                    not_weight_merge = false;
                }

                if (this.orderlines.at(i).discount > 0) {
                    discount_merge = false;
                    if (this.get_partner()) {
                        if (
                            this.selected_orderline &&
                            this.selected_orderline.product.allow_discount &&
                            this.selected_orderline.refunded_orderline_id == undefined
                        ) {
                            if (this.orderlines.at(i).discount === this.get_partner().customer_discount) {
                                discount_merge = true;
                            }
                        }
                    }
                }

                if (
                    this.orderlines.at(i).can_be_merged_with(line) &&
                    options.merge !== false &&
                    discount_merge &&
                    not_weight_merge
                ) {
                    to_merge_orderline = this.orderlines.at(i);
                }
            }

            if (to_merge_orderline) {
                to_merge_orderline.merge(line);
                this.select_orderline(to_merge_orderline);
            } else {
                this.add_orderline(line);
                this.select_orderline(this.get_last_orderline());
            }

            if (options.draftPackLotLines) {
                this.selected_orderline.setPackLotLines({
                    ...options.draftPackLotLines,
                    setQuantity: options.quantity === undefined
                });
            }

            if (options.is_saved) {
                this.selected_orderline.set_discount(options.discount);
            } else {
                if (this.get_partner()) {
                    if (
                        this.selected_orderline.product.allow_discount &&
                        this.selected_orderline.refunded_orderline_id == undefined &&
                        !options.is_imported
                    ) {
                        this.selected_orderline.set_discount(this.get_partner().customer_discount);
                    }
                }
            }

            if (typeof this._updateRewards === "function") {
                this._updateRewards();
            }

            const selectedLine = this.get_selected_orderline();
            const familyId = selectedLine && selectedLine.getPricingFamilyId
                ? selectedLine.getPricingFamilyId()
                : false;

            if (familyId && this.recomputeFamilyPrices) {
                this.recomputeFamilyPrices(familyId);
            } else if (
                selectedLine &&
                !selectedLine.price_manually_set &&
                !selectedLine.price_automatically_set
            ) {
                selectedLine.set_unit_price(
                    selectedLine.product.get_price(
                        this.pricelist,
                        selectedLine.get_quantity(),
                        selectedLine.get_price_extra()
                    )
                );
                this.fix_tax_included_price(selectedLine);
            }
        }
    };

    Registries.Model.extend(Order, PosOrder);

    return PosOrder;
});