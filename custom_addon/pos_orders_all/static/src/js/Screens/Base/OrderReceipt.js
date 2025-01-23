odoo.define('pos_orders_all.BiOrderReceipt', function(require) {
	"use strict";

	const OrderReceipt = require('point_of_sale.OrderReceipt');
	const ReceiptScreen = require('point_of_sale.ReceiptScreen');
	const Registries = require('point_of_sale.Registries');
	const { onMounted, useRef, status } = owl;

	const BiOrderReceipt = OrderReceipt => 
		class extends OrderReceipt {
			setup() {
            	super.setup();
            	onMounted(() => {
                    var order = this.props.order;
					$("#barcode_print").barcode(
						order.barcode, // Value barcode (dependent on the type of barcode)
						"code128", // type (string)
						{output:"svg"}
					);
                });
            	
			}

			get receipt() {
				let order = this.env.pos.get_order();
				let receipt = this.receiptEnv.receipt;
				let disc_type = this.env.pos.config.discount_type;
				if(disc_type == 'fixed'){
					receipt['total_discount'] = order.get_fixed_discount();
				}
				return receipt;
			}

			get receiptBarcodeData(){
				var order = this.props.order;
				$("#barcode_print").barcode(
					order.barcode, // Value barcode (dependent on the type of barcode)
					"code128", // type (string)
					{output:"svg"}
				);
				return true
			}

			
		
	};
	Registries.Component.extend(OrderReceipt, BiOrderReceipt);
	return OrderReceipt
});