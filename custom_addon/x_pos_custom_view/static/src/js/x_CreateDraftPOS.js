odoo.define('x_pos_custom_view.ExtendCreateDraftPOS', function(require) {
    'use strict';

    const CreateDraftPOS = require('pos_all_in_one.CreateDraftPOS');
    const Registries = require('point_of_sale.Registries');

    // Extender la clase CreateDraftPOS
    const ExtendCreateDraftPOS = CreateDraftPOS => class extends CreateDraftPOS {
        setup() {
            // Llamar al método setup original
            super.setup();
            // Aquí puedes agregar cualquier lógica adicional en el setup si lo necesitas
        }

		async onClick() {
			let self = this;

			const { confirmed } = await this.showPopup('ConfirmPopup', {
				title: this.env._t('Crear Borrador'),
				body: this.env._t('¿Está seguro que desea crear orden en borrador?'),
			});
			if (confirmed === false) {
				return;
			}	

			let order = this.env.pos.get_order();
			let orderlines = order.get_orderlines();
			let partner_id = order.get_partner();

            for (let i = 0; i < orderlines.length; i++) {
                let orderline = orderlines[i];
                if (orderline.get_quantity() <= 0) {
                    return this.showPopup('ErrorPopup', {
                        title: this.env._t('Partida inválida'),
                        body: this.env._t('Todas las cantidades deben ser mayores que cero.'),
                    });
                }
			}

			if (!partner_id){
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Unknown customer'),
					body: self.env._t('You cannot Create Order.Select customer first.'),
				});				
			}
			else if(orderlines.length === 0){
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Empty Order'),
					body: self.env._t('There must be at least one product in your order.'),
				});
			}
			else if(order.to_invoice){
				return self.showPopup('ErrorPopup', {
					'title': self.env._t('Order Validation'),
					'body': self.env._t('You Can not create invoice for draft order,please uncheck "Invoice" from payment screen.'),
				});
				return;
			}
			else{
				if(order.get_total_with_tax() !== order.get_total_paid()){
					order.amount_due = order.get_due();
					order.is_draft_order = true;
					order.is_partial = true;
					order.to_invoice = false;
					order.creation_date = new Date();
					this.env.services.ui.block()
					let syncOrderResult = await this.env.pos.push_single_order(order);
					this.env.services.ui.unblock();
					this.env.pos.get_order().set_order_reference_no(syncOrderResult[0].name)
					self.showScreen('ReceiptScreen');			
				}
			}

		}

    };

    // Registrar la nueva clase extendida
    Registries.Component.extend(CreateDraftPOS, ExtendCreateDraftPOS);
});
