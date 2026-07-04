odoo.define('sale_pricing_family.pricing_family_order', function (require) {
    "use strict";

    const { Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    const PricingFamilyOrder = (Order) => class PricingFamilyOrder extends Order {

        getFamilyLines(familyId) {
            if (!familyId) {
                return [];
            }

            return this.get_orderlines().filter(line => {
                return line &&
                    line.get_product &&
                    line.get_product() &&
                    line.getPricingFamilyId &&
                    line.getPricingFamilyId() === familyId;
            });
        }

        getFamilyQty(familyId) {
            return this.getFamilyLines(familyId).reduce((sum, line) => {
                return sum + (line.get_quantity() || 0);
            }, 0);
        }

        getLineEffectiveQty(line) {
            if (!line || !line.getPricingFamilyId) {
                return line ? (line.get_quantity() || 0) : 0;
            }

            const familyId = line.getPricingFamilyId();
            if (!familyId) {
                return line.get_quantity() || 0;
            }

            return this.getFamilyQty(familyId);
        }

        recomputeFamilyPrices(familyId) {
            if (!familyId) {
                return;
            }

            const lines = this.getFamilyLines(familyId);
            if (!lines.length) {
                return;
            }

            const familyQty = this.getFamilyQty(familyId);

            lines.forEach(line => {
                if (!line.product) {
                    return;
                }

                if (line.price_manually_set || line.price_automatically_set) {
                    return;
                }

                const newPrice = line.product.get_price(
                    this.pricelist,
                    familyQty,
                    line.get_price_extra()
                );

                line.set_unit_price(newPrice);
                this.fix_tax_included_price(line);
            });
        }
    };

    Registries.Model.extend(Order, PricingFamilyOrder);

    return PricingFamilyOrder;
});