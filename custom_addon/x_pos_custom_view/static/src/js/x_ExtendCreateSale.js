odoo.define('x_pos_custom_view.x_ExtendCreateSale', function(require) {
    'use strict';

    const CreateSale = require('pos_orders_all.CreateSale');
    const Registries = require('point_of_sale.Registries');

    // Extender la clase CreateSale
    const ExtendCreateSale = CreateSale => class extends CreateSale {
        setup() {            
            super.setup();            
        }

		async onClick(){
			var self = this;
			var order = self.env.pos.get_order();
			var orderlines = order.orderlines;
			var cashier_id = self.env.pos.get_cashier().user_id;
            var saleperson_id = self.env.pos.cust_salespersion.id;            ;
			var partner_id = false;
			var pos_product_list = [];            

			const { confirmed } = await this.showPopup('ConfirmPopup', {
				title: this.env._t('Crear Borrador'),
				body: this.env._t('¿Está seguro que desea crear cotización?'),
			});
			if (confirmed === false) {
				return;
			}	

            for (let i = 0; i < orderlines.length; i++) {
                let orderline = orderlines[i];
                if (orderline.get_quantity() <= 0) {
                    return this.showPopup('ErrorPopup', {
                        title: this.env._t('Partida inválida'),
                        body: this.env._t('Todas las cantidades deben ser mayores que cero.'),
                    });
                }
			}

			if (order.get_partner() != null)
				partner_id = order.get_partner().id;
			
			if (!partner_id) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Cliente desconocido'),
					body: self.env._t('No puede crear orden de venta. Selecciona cliente primero.'),
				});
			}

			if (orderlines.length === 0) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Orden vacia'),
					body: self.env._t('Debe haber al menos un producto antes de crear la orden.'),
				});
			}
			
			for (var i = 0; i < orderlines.length; i++) {
				var product_items = {
					'id': orderlines[i].product.id,
					'quantity': orderlines[i].quantity,
					'uom_id': orderlines[i].product.uom_id[0],
					'price': orderlines[i].price,
					'discount': orderlines[i].discount,
				};
				pos_product_list.push({'product': product_items });
			}		

			self.rpc({
				model: 'pos.order',
				method: 'create_sales_order',
				args: [partner_id, partner_id, pos_product_list, saleperson_id],
			}).then(function(output) {
				alert('Sales Order Created !!!!');
                self.remove_current_orderlines();
                // self.env.pos.add_new_order()
                self.showScreen('ProductScreen');
			});
		}
    };

    // Registrar la nueva clase extendida
    Registries.Component.extend(CreateSale, ExtendCreateSale);
});
