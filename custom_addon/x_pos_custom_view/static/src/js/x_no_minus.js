odoo.define('x_pos_custom_view.x_no_minus', function (require) {
    "use strict";

    const { PosGlobalState, Orderline} = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    var PosDB = require('point_of_sale.DB');
    var config = require('web.config');
    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var time = require('web.time');
    var utils = require('web.utils');
    var { Gui } = require('point_of_sale.Gui');
    const { batched, uuidv4 } = require("point_of_sale.utils");
    const { escape } = require("@web/core/utils/strings");
    const rpc = require('web.rpc');
    
    var QWeb = core.qweb;
    var _t = core._t;
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;
    const Markup = utils.Markup
    
    const { markRaw, reactive } = owl;
    
    // Container of the product images fetched during rendering
    // of customer display. There is no need to observe it, thus,
    // we are putting it outside of PosGlobalState.
    const PRODUCT_ID_TO_IMAGE_CACHE = {};
    
    /**
     * If optimization is needed, then we should implement this
     * using a Balanced Binary Tree to behave like an Object and an Array.
     * But behaving like Object (indexed by cid) might not be
     * needed. Let's see how it turns out.
     */

    const OrderlineRestrictNegative = (Orderline) => class extends Orderline {
        
        setup() {
            super.setup();
        }
        
        set_quantity(quantity, keep_price) {
        
        this.order.assert_editable();

        if(quantity === 'remove'){
            if (this.refunded_orderline_id in this.pos.toRefundLines) {
                delete this.pos.toRefundLines[this.refunded_orderline_id];
            }
            this.order.remove_orderline(this);
            return true;
        }else{
            var quant = typeof(quantity) === 'number' ? quantity : (field_utils.parse.float('' + (quantity ? quantity : 0 )));
            if (this.refunded_orderline_id in this.pos.toRefundLines) {
                const toRefundDetail = this.pos.toRefundLines[this.refunded_orderline_id];
                const maxQtyToRefund = toRefundDetail.orderline.qty - toRefundDetail.orderline.refundedQty
                if (quant > 0) {
                    Gui.showPopup('ErrorPopup', {
                        title: _t('Positive quantity not allowed'),
                        body: _t('Only a negative quantity is allowed for this refund line. Click on +/- to modify the quantity to be refunded.')
                    });
                    return false;
                } else if (quant == 0) {
                    toRefundDetail.qty = 0;
                } else if (-quant <= maxQtyToRefund) {
                    toRefundDetail.qty = -quant;
                } else {
                    Gui.showPopup('ErrorPopup', {
                        title: _t('Greater than allowed'),
                        body: _.str.sprintf(
                            _t('The requested quantity to be refunded is higher than the refundable quantity of %s.'),
                            this.pos.formatProductQty(maxQtyToRefund)
                        ),
                    });
                    return false;
                }
            }
            if (this.pos.toRefundLines) {
                var numRefundLines = Object.keys(this.pos.toRefundLines).length;
            } else {
                var numRefundLines = 0;
            }
            if (numRefundLines > 0 && quant > 0){
                quant = 0;   
            }
            if (numRefundLines > 0 && quant < 0){
                var exists = Object.values(this.pos.toRefundLines).some(item => item.orderline.productId === this.product.id);
                if(!exists){
                    quant = 0;  
                    Gui.showPopup('ErrorPopup', {
                        title: _t('Producto fuera de orden'),
                        body: _t('No puede reembolsar productos fuera de la orden')
                    });
                    return false;                    
                }          
            }            

            var unit = this.get_unit();
            if(unit){
                if (unit.rounding) {
                    var decimals = this.pos.dp['Product Unit of Measure'];
                    var rounding = Math.max(unit.rounding, Math.pow(10, -decimals));
                    this.quantity    = round_pr(quant, rounding);
                    this.quantityStr = field_utils.format.float(this.quantity, {digits: [69, decimals]});
                } else {
                    this.quantity    = round_pr(quant, 1);
                    this.quantityStr = this.quantity.toFixed(0);
                }
            }else{
                this.quantity    = quant;
                this.quantityStr = '' + this.quantity;
            }
        }

        // just like in sale.order changing the quantity will recompute the unit price
        if(! keep_price && ! (this.price_manually_set || this.price_automatically_set)){
            this.set_unit_price(this.product.get_price(this.order.pricelist, this.get_quantity(), this.get_price_extra()));
            this.order.fix_tax_included_price(this);
        }
        return true;
    
    }

    can_be_merged_with(orderline){
        var price = parseFloat(round_di(this.price || 0, this.pos.dp['Product Price']).toFixed(this.pos.dp['Product Price']));
        var order_line_price = orderline.get_product().get_price(orderline.order.pricelist, this.get_quantity());
        order_line_price = round_di(orderline.compute_fixed_price(order_line_price), this.pos.currency.decimal_places);
        if( this.get_product().id !== orderline.get_product().id){    //only orderline of the same product can be merged
            return false;
        }else if(!this.get_unit() || !this.get_unit().is_pos_groupable){
            return false;        
        }else if(!utils.float_is_zero(price - order_line_price - orderline.get_price_extra(),
                    this.pos.currency.decimal_places)){
            return false;
        }else if(this.product.tracking == 'lot' && (this.pos.picking_type.use_create_lots || this.pos.picking_type.use_existing_lots)) {
            return false;
        }else if (this.description !== orderline.description) {
            return false;
        }else if (orderline.get_customer_note() !== this.get_customer_note()) {
            return false;
        } else if (this.refunded_orderline_id) {
            return false;
        }else{
            return true;
        }
    }

};

Registries.Model.extend(Orderline, OrderlineRestrictNegative);
});