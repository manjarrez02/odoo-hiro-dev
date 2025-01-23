odoo.define('pos_all_in_one.pos', function (require) {
	"use strict";

	const { PosGlobalState, Order, Orderline, Payment } = require('point_of_sale.models');
	const Registries = require('point_of_sale.Registries');
	var utils = require('web.utils');
	var PosDB = require('point_of_sale.DB');
	var round_pr = utils.round_precision;
	
	PosDB.include({
		get_unpaid_orders: function(){
			var saved = this.load('unpaid_orders',[]);
			var orders = [];
			for (var i = 0; i < saved.length; i++) {
				let odr = saved[i].data;
				if(!odr.is_paying_partial && !odr.is_partial && !odr.is_draft_order){
					orders.push(saved[i].data);
				}
				if(odr.is_paying_partial || odr.is_partial || odr.is_draft_order){
					saved = _.filter(saved, function(o){
						return o.id !== odr.uid;
					});
				}
			}
			this.save('unpaid_orders',saved);
			return orders;
		},
	});

	const PosHomePosGlobalState = (PosGlobalState) => class PosHomePosGlobalState extends PosGlobalState {
		constructor(obj) {
        	super(obj);
        	this.cust_salespersion = null;
			this.cust_salespersion_id = null;
        }
		async _processData(loadedData) {
			await super._processData(...arguments);
			let self = this;
			self.pos_category = loadedData['pos_category'];
			self.stockwarehouse = loadedData['stock.warehouse'];
            self.stockpickingtype = loadedData['stock.picking.type'];
            self.stocklocations = loadedData['stock.location'];
            self.pos_sessions = loadedData['pos_sessions'];
            self.stockpicking = loadedData['stock.picking'];
            self.pos_order = loadedData['pos_order'] || [];
            self.pos_loyalty_setting = loadedData['pos.loyalty.setting'];
			self.pos_redeem_rule = loadedData['pos.redeem.rule'];

			self.users = loadedData['res.users'];
			self.cust_salespersion = loadedData['res.users']
			self.pos_salesperson_record = loadedData['users'];
			self.access_of_users = loadedData['users1'];
		}

		get_cust_salespersion() {
	        return this.cust_salespersion;
	    }

	    get_cust_salespersion_id(){
	    	return this.cust_salespersion.id
	    }

	    set_cust_salespersion(employee) {
	        this.cust_salespersion = employee;
	    }

	    set_cust_salespersion_id(){
	    	return this.cust_salespersion.id
	    }
	}
	Registries.Model.extend(PosGlobalState, PosHomePosGlobalState);


	const PosOrder = (Order) => class PosOrder extends Order {
		constructor(obj, options) {
			super(...arguments);
			this.loyalty = this.loyalty  || 0;
			this.redeemed_points = this.redeemed_points || 0;
			this.redeem_done = this.redeem_done || false;
			this.remove_true = this.remove_true || false;
			this.redeem_point = this.redeem_point || 0;
			this.remove_line = this.remove_line || false;
			this.order_reference_no = this.get_order_reference_no() || false;
			this.is_partial    = false;
			this.is_paying_partial    = false;
			this.amount_due    = 0;
			this.amount_paid    = 0;
			this.is_draft_order = false;
			this.set_is_partial();

			this.cust_salep_id = this.cust_salep_id || this.pos.cust_salespersion.id
			this.cust_saleper_due_id = this.cust_saleper_due_id
			this.cust_saleper_limit_id = this.cust_saleper_limit_id
			this.pos_customer_discount    = 0;


			var default_customer = this.pos.config.res_partner_id;
	        var default_customer_by_id = this.pos.db.get_partner_by_id(default_customer[0]);
		    if(!this.partner){
		        if(default_customer_by_id){
		            this.set_partner(default_customer_by_id);
		        } else{
		            this.set_partner(null);
		        }
		    }
		}

		
		set_cust_salep_id (salep_id){
			this.cust_salep_id = salep_id
		}

		set_cust_saleper_due_id (cust_saleper_due_id){
			this.cust_saleper_due_id = cust_saleper_due_id
		}

		set_cust_saleper_limit_id (cust_saleper_limit_id){
			this.cust_saleper_limit_id = cust_saleper_limit_id
		}

		set_pos_customer_discount (customer_discount){
			this.pos_customer_discount = customer_discount
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
				if(this.orderlines.at(i).can_be_merged_with(line) && options.merge !== false){
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

			if(this.get_partner()){
				if(this.selected_orderline.product.allow_discount && this.selected_orderline.refunded_orderline_id == undefined){
					this.selected_orderline.set_discount(this.get_partner().customer_discount)
				}
			}

		}


		get_total_without_tax() {
			if(this.pos.config.allow_customer_discount){
		        let total = round_pr(this.orderlines.reduce((function(sum, orderLine) {
		            return sum + orderLine.get_price_without_tax();
		        }), 0), this.pos.currency.rounding);

		        let customer_discount = 0;
		        if(this.partner){
		            if(this.partner.customer_discount){
		                if(this.orderlines.length > 0){
		                    customer_discount = ((total*this.partner.customer_discount)/100)
		                    this.set_pos_customer_discount(customer_discount)


		                }
		            }
		        }

		        return total-customer_discount;
			}else{
		        return round_pr(this.orderlines.reduce((function(sum, orderLine) {
		            return sum + orderLine.get_price_without_tax();
		        }), 0), this.pos.currency.rounding);				
			}
	    }

		set_order_reference_no(number){
	        this.order_reference_no = number;
	    }
	    get_order_reference_no() {
	        return this.order_reference_no;
	    }
		
		init_from_JSON(json){
			super.init_from_JSON(...arguments);			
			this.loyalty = json.loyalty;
			this.redeem_done = json.redeem_done;
			this.redeemed_points = json.redeemed_points;
			this.remove_true = json.remove_true || false;
			this.redeem_point = json.redeem_point || 0;
			this.remove_line = json.remove_line || false;
			this.order_reference_no = json.order_reference_no;
			this.is_partial = json.is_partial;
			this.amount_due = json.amount_due;
			this.is_paying_partial = json.is_paying_partial;
			this.is_draft_order = json.is_draft_order;
			this.cust_salep_id = json.cust_salep_id
			this.cust_saleper_due_id = json.cust_saleper_due_id
			this.cust_saleper_limit_id = json.cust_saleper_limit_id
			this.pos_customer_discount = json.pos_customer_discount
		}

		export_as_JSON(){
			const json = super.export_as_JSON(...arguments);			
			json.redeemed_points = this.redeemed_points;
			json.loyalty = this.get_loyalty_points();
			json.redeem_done = this.redeem_done;
			json.remove_true = this.remove_true || false;
			json.redeem_point = this.redeem_point || 0;
			json.remove_line = this.remove_line || false;
			json.order_reference_no = this.order_reference_no;
			json.is_partial = this.is_partial || false;
			json.amount_due = this.get_partial_due();
			json.is_paying_partial = this.is_paying_partial;
			json.is_draft_order = this.is_draft_order || false;
			json.cust_salep_id = this.cust_salep_id || this.pos.user.id;
			json.cust_saleper_due_id = this.cust_saleper_due_id;
			json.cust_saleper_limit_id = this.cust_saleper_limit_id;
			json.pos_customer_discount = this.pos_customer_discount || 0
			return json;
		}

		export_for_printing() {
	        const json = super.export_for_printing(...arguments);
	        json.order_reference_no = this.get_order_reference_no();
	        return json;
	    }

		set_is_partial(set_partial){
    		this.is_partial = set_partial || false;
			/*this.trigger('change',this);*/
    	}
    
    	get_partial_due(){
    		let due = 0;
			if(this.get_due() > 0){
				due = this.get_due();
			}
			return due
    	}

		remove_orderline(line) {
			this.redeem_done = false;
			if(line.id ==this.remove_line){
				this.remove_true = true;
				let partner = this.get_partner();
				if (partner) {
					partner.loyalty_points1 = partner.loyalty_points1 + parseFloat(this.redeem_point) ;
				}
			}
			else{
				this.remove_true = false;
			}
			super.remove_orderline(...arguments);
		}


		get_redeemed_points(){
			return this.redeemed_points;
		}

		set_loyalty_value(loaylty_point){
			this.loyalty = parseFloat(loaylty_point.toFixed(2));
		}

		get_loyalty_points () {
			return this.loyalty;
		}

		get_total_loyalty(){
			let round_pr = utils.round_precision;
			let round_di = utils.round_decimals;
			let rounding = this.pos.currency.rounding;
			let final_loyalty = 0
			let order = this.pos.get_order();
			let orderlines = this.get_orderlines();
			let partner_id = this.get_partner();

			if(this.pos.pos_loyalty_setting.length != 0)
			{	
			   if (this.pos.pos_loyalty_setting[0].loyalty_basis_on == 'pos_category') {
					if (partner_id){
						let loyalty = 0;
						for (let i = 0; i < orderlines.length; i++) {
							let lines = orderlines[i];
							let cat_ids = this.pos.db.get_category_by_id(lines.product.pos_categ_id[0])
							if(cat_ids){
								if (cat_ids['Minimum_amount']>0){
									final_loyalty += lines.get_price_with_tax() / cat_ids['Minimum_amount'];
								}
							}
						}
						return parseFloat(final_loyalty.toFixed(2));
					}
			   }else if (this.pos.pos_loyalty_setting[0].loyalty_basis_on == 'amount') {
					let loyalty_total = 0;
					if (order && partner_id){
						let amount_total = order.get_total_with_tax();
						let subtotal = order.get_total_without_tax();
						let loyaly_points = this.pos.pos_loyalty_setting[0].loyality_amount;
						final_loyalty += (amount_total / loyaly_points);
						
						loyalty_total = partner_id.loyalty_points1 + final_loyalty;
						this.set_loyalty_value(final_loyalty)
						return parseFloat(final_loyalty.toFixed(2));
					}
				}
			}
			return parseFloat(final_loyalty.toFixed(2));
		}

	}

	Registries.Model.extend(Order, PosOrder);

	const PaymentLine = (Payment) => class PaymentLine extends Payment {
        setup() {
            super.setup();
            this.pos_reference = this.pos_reference || "";
        }

        set_pos_reference(pos_reference){
            this.pos_reference = pos_reference;
        }

        get_pos_reference(){
            return this.pos_reference;
        }
        
        init_from_JSON(json){
            super.init_from_JSON(...arguments);
            this.pos_reference = json.pos_reference || "";
        }

        export_as_JSON(){
            const json = super.export_as_JSON(...arguments);
            json.pos_reference = this.pos_reference || "";
            return json;
        }

        export_for_printing() {
            const json = super.export_for_printing(...arguments);
            json.pos_reference = this.pos_reference || "";
            return json;
        }

    }
    Registries.Model.extend(Payment, PaymentLine);

})
