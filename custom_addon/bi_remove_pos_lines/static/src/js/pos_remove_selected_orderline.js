odoo.define('bi_remove_pos_lines.pos_remove_selected_orderline', function(require) {
    'use strict';

   const Orderline = require("point_of_sale.Orderline");
   const Registries = require("point_of_sale.Registries");

   const PosSelectedOrderline = (Orderline) =>
        class extends Orderline {
            removeSelectedLine() {
                this.props.line.set_quantity("remove");
            }
        };

    Registries.Component.extend(Orderline, PosSelectedOrderline);
    return Orderline;

});