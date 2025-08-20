odoo.define('x_pos_custom_view.x_add_product', function (require) {
    "use strict";

    const { PosGlobalState, Order, Orderline, Payment } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    var utils = require('web.utils');
    var PosDB = require('point_of_sale.DB');
    var round_pr = utils.round_precision;

    const PosOrder = (Order) => class PosOrder extends Order {

		setup() {
			super.setup();
		}

		add_product(product, options){
			
			if(this.pos.doNotAllowRefundAndSales() &&
			this._isRefundAndSaleOrder() &&
			(!options.quantity || options.quantity > 0)) {
				Gui.showPopup('ErrorPopup', {
					title: _t('Refund and Sales not allowed'),
					body: _t('It is not allowed to mix refunds and sales')
				});
				return;
			}
			if(this._printed){
				// when adding product with a barcode while being in receipt screen
				this.pos.removeOrder(this);
				return this.pos.add_new_order().add_product(product, options);
			}
			this.assert_editable();
			options = options || {};
			var line = Orderline.create({}, {pos: this.pos, order: this, product: product});
			this.fix_tax_included_price(line);

			this.set_orderline_options(line, options);

			var to_merge_orderline;
			for (var i = 0; i < this.orderlines.length; i++) {
				var discount_merge = true;
                var not_weight_merge = true;
                if(product.to_weight){
                    not_weight_merge = false;
                }
				if(this.orderlines.at(i).discount > 0){
					discount_merge = false;
					if(this.get_partner()){
						if(this.selected_orderline.product.allow_discount && this.selected_orderline.refunded_orderline_id == undefined){
							if(this.orderlines.at(i).discount === this.get_partner().customer_discount){
								var discount_merge = true;		
							} 
						}
					}
				}
				if(this.orderlines.at(i).can_be_merged_with(line) && options.merge !== false && discount_merge && not_weight_merge){
					to_merge_orderline = this.orderlines.at(i);
				}
			}
			if (to_merge_orderline){
				to_merge_orderline.merge(line);
				this.select_orderline(to_merge_orderline);
			} else {
				this.add_orderline(line);
				this.select_orderline(this.get_last_orderline());
			}

			if (options.draftPackLotLines) {
				this.selected_orderline.setPackLotLines({ ...options.draftPackLotLines, setQuantity: options.quantity === undefined });
			}
			if(options.is_saved){
				this.selected_orderline.set_discount(options.discount)
			}
			else{
				if(this.get_partner()){
					if(this.selected_orderline.product.allow_discount && this.selected_orderline.refunded_orderline_id == undefined && !options.is_imported){					
						this.selected_orderline.set_discount(this.get_partner().customer_discount)					
					}				
				}
			}
			if (typeof this._updateRewards === "function") {
				this._updateRewards();
			}
		}
    };

    // Registra la nueva clase en el sistema
    Registries.Model.extend(Order, PosOrder);

    return PosOrder;
});