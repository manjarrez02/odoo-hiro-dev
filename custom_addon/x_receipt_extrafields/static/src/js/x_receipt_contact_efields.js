odoo.define('x_receipt_extrafields.x_receipt_contact_efields', function(require) {
    'use strict';

    var { Order } = require('point_of_sale.models');
    var Registries = require('point_of_sale.Registries');

    const CustomOrder = (Order) => class CustomOrder extends Order {
        export_for_printing() {
            var result = super.export_for_printing(...arguments);
            var neighborhood_id = this.get_partner().neighborhood_id;
            result.neighborhood_id = neighborhood_id;
            return result;
        }
    };

    Registries.Model.extend(Order, CustomOrder);

});