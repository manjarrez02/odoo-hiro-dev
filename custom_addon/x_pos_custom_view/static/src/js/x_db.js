odoo.define('x_pos_custom_view.x_db', function (require) {
    "use strict";

    var PosDB = require('point_of_sale.DB');

    PosDB.include({
        init: function (options) {
            options = options || {};
            options.limit = 30; // Cambia aquí el valor que prefieras
            this._super(options); // Llama al método original con las opciones modificadas
        }
    });
});