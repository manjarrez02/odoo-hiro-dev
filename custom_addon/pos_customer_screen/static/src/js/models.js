odoo.define('pos_customer_screen.models', function (require) {
    "use strict";

    var { PosGlobalState, Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    const Orderline = require("point_of_sale.Orderline");
    const utils = require('web.utils');
    var round_di = utils.round_decimals;
    var rpc = require('web.rpc');


    const PosCustomerScreenPosGlobalState = (PosGlobalState) => class PosCustomerScreenPosGlobalState extends PosGlobalState {
        constructor(obj, options) {
            super(...arguments);
        }
        async load_server_data(){
            if (odoo.config_id) {
                const pos_config = await this.env.services.rpc({
                    model: 'pos.config',
                    method: 'search_read',
                    domain: [['id', '=', odoo.config_id]],
                    fields: ['current_session_id'],
                });
                if (!pos_config.length || !pos_config[0].current_session_id) {
                    console.error("Customer Display: No active POS session found for config_id", odoo.config_id);
                    return;
                }
                let pos_session_id = pos_config[0].current_session_id[0];
                const loadedData = await this.env.services.rpc({
                    model: 'pos.session',
                    method: 'load_customer_display_data',
                    args: [[pos_session_id]],
                });

                // Fallbacks defensivos para extensiones JS de módulos de terceros
                loadedData['account.move'] = loadedData['account.move'] || [];
                loadedData['account.journal'] = loadedData['account.journal'] || [];
                loadedData['product.template'] = loadedData['product.template'] || [];
                loadedData['stock.warehouse'] = loadedData['stock.warehouse'] || [];
                loadedData['stock.location'] = loadedData['stock.location'] || [];
                loadedData['stock.picking'] = loadedData['stock.picking'] || [];
                loadedData['pos_sessions'] = loadedData['pos_sessions'] || [];
                loadedData['pos_order'] = loadedData['pos_order'] || [];
                loadedData['pos.order'] = loadedData['pos.order'] || [];
                loadedData['pos.loyalty.setting'] = loadedData['pos.loyalty.setting'] || [];
                loadedData['pos.redeem.rule'] = loadedData['pos.redeem.rule'] || [];
                loadedData['users'] = loadedData['users'] || [];
                loadedData['users1'] = loadedData['users1'] || [];
                loadedData['pos.gift.coupon'] = loadedData['pos.gift.coupon'] || [];
                loadedData['poscurrency'] = loadedData['poscurrency'] || [];
                loadedData['product.barcode'] = loadedData['product.barcode'] || [];
                loadedData['res.config.settings'] = loadedData['res.config.settings'] || [];
                loadedData['pos.receipt'] = loadedData['pos.receipt'] || [];

                await this._processData(loadedData);
                return this.after_load_server_data();
            } else {
                await super.load_server_data(...arguments);
            }
        }

        async _processData(loadedData) {
            await super._processData(...arguments);
            if(this.config.customer_display){
              this.customer = loadedData['customer.display'];
              this.adVideo = loadedData['ad.video'];
              this.adVideoList = await this.loadAdVideoData();
            }
        }
        loadAdVideoData() {
            let ad_video_list = [];
            for (let record of this.adVideo) {
                ad_video_list.push(record);
            }
            return ad_video_list;
        }
        set_order_on_table(order) {
            var orders = this.get_order_list();
            if (orders.length) {
                order = order ? orders.find((o) => o.uid === order.uid) : null;
                if (order) {
                    this.set_order(order);
                } else {
                    orders = orders.filter(order => !order.finalized);
                    if (orders.length) {
                        this.set_order(orders[0]);
                    } else {
                        this.add_new_order();
                    }
                }
            } else {
                this.add_new_order();
            }
            if(this.config.pos_customer_display){
                this.get_order().mirror_image_data();
            }
        }
    }
    Registries.Model.extend(PosGlobalState, PosCustomerScreenPosGlobalState);


    const PosCustomerScreenOrder = (Order) => class PosCustomerScreenOrder extends Order {
        constructor(obj, options) {
            super(...arguments);
            this.sign = this.sign || null;
            this.raw_sign = this.raw_sign || null;
            this.rating = this.rating || '0';
        }
        async add_product(product, options){
            await super.add_product(...arguments);
            if(this.pos.config.customer_display){
                this.mirror_image_data();
            }
        }
        mirror_image_data(neworder){
            var client_name = false;
            var order_total = this.get_total_with_tax();
            var change_amount = this.get_change();
            var payment_info = [];
            var paymentlines = this.paymentlines;
            if(paymentlines && paymentlines[0]){
                paymentlines.map(function(paymentline){
                    payment_info.push({
                        'name':paymentline.name,
                        'amount':paymentline.amount,
                    });
                });
            }
            var orderLines = [];
            for (let item of this.orderlines){
                let line_data = item.export_as_JSON();
                line_data.uom_name = item.get_unit() ? item.get_unit().name : (item.product && item.product.uom_id ? item.product.uom_id[1] : '');
                line_data.lst_price = item.product ? item.product.lst_price : item.price;
                orderLines.push(line_data);
            }
            if(this.get_partner()){
                client_name = this.get_partner().name;
            }
            const total = this.get_total_with_tax() || 0;
            const tax = total - this.get_total_without_tax() || 0;
            var vals = {
                'orderLines': orderLines,
                'total': total,
                'tax': tax,
                'client_name':client_name,
                'order_total':order_total,
                'change_amount':change_amount,
                'payment_info':payment_info,
                'enable_customer_rating':this.pos.config.enable_customer_rating,
                'set_customer':this.pos.config.set_customer,
                'enable_signature':this.pos.config.enable_signature,
                'config_id':this.pos.config.id,
                'client_uuid': localStorage.getItem('pos_client_uuid'), 
            }
            if(neworder){
                vals['new_order'] = true;
            }
            console.log("Toca hacer broadcast en customer screen");
            rpc.query({
                model: 'customer.display',
                method: 'broadcast_data',
                args: [vals],
            })
            .then(function(result) {});
        }
        init_from_JSON(json){
            super.init_from_JSON(...arguments);
            this.sign = json.sign;
            this.raw_sign = json.raw_sign;
            this.rating = json.rating;
        }
        export_as_JSON(){
            const json = super.export_as_JSON(...arguments);
            json.rating = this.get_rating() || '0';
            json.sign = this.get_sign() || null;
            json.raw_sign = this.get_raw_sign() || null;
            return json;
        }
        set_partner(partner){
            super.set_partner(partner);
            if(this.pos.config.customer_display){
                this.mirror_image_data();
            }
        }
        set_rating(rating){
            this.rating = rating;
        }
        get_rating(){
            return this.rating;
        }
        set_sign(sign) {
            this.sign = sign;
        }
        get_sign(){
            return this.sign;
        }
        set_raw_sign(sign){
            this.raw_sign = sign;
        }
        get_raw_sign(){
            return this.raw_sign;
        }
    }
    Registries.Model.extend(Order, PosCustomerScreenOrder);

    const PosCustomerScreenOrderline = (Orderline) =>
        class extends Orderline {
            removeSelectedLine() {                
                this.props.line.set_quantity("remove");
                if (this.env.pos.get_order()) {
                    if(this.env.pos.config.customer_display){
                        this.env.pos.get_order().mirror_image_data();
                    }
                }
            }
        };

    Registries.Component.extend(Orderline, PosCustomerScreenOrderline);

});

