odoo.define('x_receipt_extrafields.x_receipt_efields', function(require) {
    'use strict';

    const { Orderline } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    const CustomOrderline = (Orderline) => class CustomOrderline extends Orderline {
        export_for_printing() {
            
            var result = super.export_for_printing(...arguments);
            var product_barcode = this.get_product().barcode;
            result.barcode = product_barcode;
            return result;
        }
    };

    Registries.Model.extend(Orderline, CustomOrderline);

});