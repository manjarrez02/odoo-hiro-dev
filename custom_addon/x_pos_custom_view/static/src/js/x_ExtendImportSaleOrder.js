odoo.define('x_pos_custom_view.x_ExtendImportSaleOrder', function(require) {
    'use strict';

    const ImportSaleOrder = require('pos_orders_all.ImportSaleOrder');
    const Registries = require('point_of_sale.Registries');

    const ExtendedImportSaleOrder = ImportSaleOrder => class extends ImportSaleOrder {

        setup() {
            super.setup();			
		}

        // Sobrescribir la función do_import
        do_import() {
			let self = this;
			let selectedOrder = self.env.pos.get_order();
			let orderlines = self.props.orderlines;
			let order = self.props.order;
			let imported = false;
			let partner_id = false
			let client = false
			if (order && order.partner_id != null){
				partner_id = order.partner_id[0];
				client = self.env.pos.db.get_partner_by_id(partner_id);				
				selectedOrder.set_partner(client);
			}
			let import_products = {};
			let list_of_qty = $('.entered_item_qty');
			$.each(list_of_qty, function(index, value) {
				let entered_item_qty = $(value).find('input');
				let qty_id = parseFloat(entered_item_qty.attr('qty-id'));
				let line_id = parseFloat(entered_item_qty.attr('line-id'));
				let entered_qty = parseFloat(entered_item_qty.val());
				import_products[line_id] = entered_qty;
			});
			
			$.each( import_products, function( key, value ) {
				orderlines.forEach(function(ol) {
					
					if(ol.id == key && value > 0){
						let product = self.env.pos.db.get_product_by_id(ol.product_id[0]);
						if(product){
							selectedOrder.add_product(product, {
								quantity: parseFloat(value),
								price: ol.price_unit,
								discount: ol.discount,
								is_imported : true,
							});
							
							imported = true;
						}else{
							alert("please configure product for point of sale.");
							return;
						}
					}
				});
			});
			if(imported){
				selectedOrder.set_imported_sales(order.id);
			}

			let salesperson =self.env.pos.pos_salesperson_record.find(item => item.id === order.user_id[0])		
			
			if (salesperson) {
                this.env.pos.set_cust_salespersion(salesperson);
                this.env.pos.set_cust_salespersion_id(salesperson.id);
                
                if(selectedOrder){
                    selectedOrder.set_cust_salep_id(salesperson.id)
                }
            }

			this.env.posbus.trigger('close-popup', {
                popupId: this.props.id,
                response: { confirmed: false, payload: null },
            });
			self.trigger('close-temp-screen');
        }
    }

    Registries.Component.extend(ImportSaleOrder, ExtendedImportSaleOrder);

});
