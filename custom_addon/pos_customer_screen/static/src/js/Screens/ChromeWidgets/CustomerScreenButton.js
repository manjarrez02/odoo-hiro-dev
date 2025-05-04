odoo.define('point_of_sale.CustomerScreenButton', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class CustomerScreenButton extends PosComponent {
        onClick() {
            const config_id = this.env.pos.config.id;
            const url = `/web/customer_display?config_id=${config_id}`;
            console.log("props.line:", this.props)
            // Abrir una ventana nueva anclada a esa URL
            const ventana = window.open(
                url,
                'CustomerDisplayWindow',
                'width=800,height=600,resizable=yes,scrollbars=yes'
            );
        
            // Foco a la nueva ventana si ya estaba abierta
            if (ventana) {
                ventana.focus();
            } else {
                // Esto pasa si el navegador bloqueó el popup
                alert("Por favor, permite ventanas emergentes para este sitio.");
            }
        }
    }
    CustomerScreenButton.template = 'CustomerScreenButton';

    Registries.Component.add(CustomerScreenButton);

    return CustomerScreenButton;
});
