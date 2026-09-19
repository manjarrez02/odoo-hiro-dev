odoo.define('pos_all_in_one.PayPOSOrdersScreen', function (require) {
	'use strict';

	const POSOrdersScreen = require('pos_orders_all.POSOrdersScreen');
	const Registries = require('point_of_sale.Registries');
	const { useListener } = require("@web/core/utils/hooks");
	const { onMounted, onWillUnmount, useRef } = owl;

	const PayPOSOrdersScreen = (POSOrdersScreen) =>
		class extends POSOrdersScreen {
			setup() {
				super.setup()
				this.filter_state = '';
				this.state = {
					filter_state: this.filter_state,
				};
				this.searchWordInput = useRef('search-word-input-product');
				useListener('click-pay', this.clickPay);
			}

			_clearSearch() {
	            this.searchWordInput.el.value = '';
	            this.trigger('clear-search');
	        }

			// changeFilter(state){
			// 	let self = this;
			// 	if(state == 'draft'){
			// 		this.state.filter_state  = 'Unpaid/Draft';
			// 	}else if(state == 'paid'){
			// 		this.state.filter_state  = 'Paid';
			// 	}else if(state == 'done'){
			// 		this.state.filter_state  = 'Posted';
			// 	}else if(state == 'invoiced'){
			// 		this.state.filter_state  = 'Invoiced';
			// 	}else{
			// 		this.state.filter_state  = '';
			// 	}
			// 	this.state.query = state;
			// 	const pos_orders = this.pos_orders;
			// 	this.render();
			// }

			draftFilter(){
				this.state.filter_state  = 'Unpaid/Draft';
				this.state.query = 'draft';
				const pos_orders = this.pos_orders;
				this.render();
			}
			paidFilter(){
				this.state.filter_state  = 'Paid';
				this.state.query = 'paid';
				const pos_orders = this.pos_orders;
				this.render();
			}
			doneFilter(){
				this.state.filter_state  = 'Posted';
				this.state.query = 'done';
				const pos_orders = this.pos_orders;
				this.render();
			}
			invoicedFilter(){
				this.state.filter_state  = 'Invoiced';
				this.state.query = 'invoiced';
				const pos_orders = this.pos_orders;
				this.render();
			}

			refresh_orders(){
				$('.input-search-orders').val('');
				this.state.query = '';
				this.props.selected_partner_id = false;
				this.state.filter_state  = '';
				this.render();
			}

			remove_current_orderlines(){
				let self = this;
				let order = self.env.pos.get_order();
				if (order) {
					order.set_partner(null);
					const lines = [...order.get_orderlines()];
					for (const line of lines) {
						order.remove_orderline(line);
					}
				}
			}

			async clickPay(event){
				let self = this;
				let old_order = self.env.pos.get_order();
				let order = event.detail;
				let o_id = parseInt(event.detail.id);
				let orderlines = [];
				let amount_due = order.amount_total - order.amount_paid;

				if (Array.isArray(order.lines)) {
					for (let line_id of order.lines) {
						let ol = self.env.pos.db.get_orderline_by_id && self.env.pos.db.get_orderline_by_id[line_id];
						if (ol) orderlines.push(ol);
					}
					if (orderlines.length !== order.lines.length) {
						let fetched_lines = await self.rpc({
							model: 'pos.order.line',
							method: 'search_read',
							args: [[['order_id', '=', order.id]]],
						});
						if (fetched_lines && fetched_lines.length) {
							orderlines = fetched_lines;
							if (!self.env.pos.db.get_orderline_by_id) self.env.pos.db.get_orderline_by_id = {};
							fetched_lines.forEach(l => {
								self.env.pos.db.get_orderline_by_id[l.id] = l;
							});
						}
					}
				}

				self.remove_current_orderlines();
				if(orderlines.length > 0){
					old_order.name = order.pos_reference;
					old_order.is_partial = order.is_partial;
					old_order.amount_due = amount_due;
					old_order.barcode = order.barcode;
					old_order.barcode_img = order.barcode_img;
					old_order.is_paying_partial = true;
					old_order.amount_paid  = order.amount_paid;
				}

				if (order.partner_id) {
					let client = self.env.pos.db.get_partner_by_id(order.partner_id[0]);
					old_order.set_partner(client);
				}

				if (order.fiscal_position_id && self.env.pos.fiscal_positions) {
					let fpId = Array.isArray(order.fiscal_position_id) ? order.fiscal_position_id[0] : order.fiscal_position_id;
					let fp = self.env.pos.fiscal_positions.find(f => f.id === fpId);
					if (fp) old_order.fiscal_position = fp;
				}
				if (order.pricelist_id && self.env.pos.pricelists) {
					let plId = Array.isArray(order.pricelist_id) ? order.pricelist_id[0] : order.pricelist_id;
					let pl = self.env.pos.pricelists.find(p => p.id === plId);
					if (pl) old_order.set_pricelist(pl);
				}

				function makeLineSignature(ol) {
					const pid = Array.isArray(ol.product_id) ? ol.product_id[0] : ol.product_id;
					const qty = parseFloat(ol.qty) || 0;
					const unitPrice = parseFloat(ol.price_unit) || 0;
					const discount = parseFloat(ol.discount) || 0;
					return [String(pid), String(qty), String(unitPrice), String(discount)].join('|');
				}

				function addImportedLine(ol) {
					const pid = Array.isArray(ol.product_id) ? ol.product_id[0] : ol.product_id;
					const product = self.env.pos.db.get_product_by_id(pid);
					if (!product) return;

					const qty = parseFloat(ol.qty) || 0;
					const unitPrice = parseFloat(ol.price_unit) || 0;
					const discount = isNaN(parseFloat(ol.discount)) ? 0 : parseFloat(ol.discount);
					const isDiscountLine = unitPrice < 0;

					old_order.add_product(product, {
						quantity: qty,
						price: isDiscountLine ? 0 : unitPrice,
						discount: isDiscountLine ? 0 : discount,
						merge: false,
						is_saved: true,
						extras: {
							price_manually_set: true,
							_loaded_from_saved_order: true,
						},
					});

					const line = old_order.get_last_orderline();
					if (line) {
						if (typeof line.set_unit_price === 'function') line.set_unit_price(unitPrice);
						else line.price = unitPrice;

						line.price_manually_set = true;
						if (typeof line.set_price_manually === 'function') line.set_price_manually(true);

						line._loaded_from_saved_order = true;
						line._loaded_signature = makeLineSignature(ol);

						if (typeof line.set_is_reward_line === 'function') line.set_is_reward_line(false);
					}
				}

				function pruneAutoDiscounts() {
					const lines = old_order.get_orderlines();
					for (const l of [...lines]) {
						const isMine = !!l._loaded_from_saved_order;
						const unitPrice = typeof l.get_unit_price === 'function' ? l.get_unit_price() : (l.price || 0);
						const pctDiscount = typeof l.get_discount === 'function' ? parseFloat(l.get_discount()) || 0 : parseFloat(l.discount) || 0;
						const isReward = l.is_reward_line === true;

						const looksLikeAutoDiscount =
							(!isMine && isReward) ||
							(!isMine && unitPrice < 0) ||
							(!isMine && pctDiscount !== 0);

						if (looksLikeAutoDiscount) {
							if (typeof old_order.remove_orderline === 'function') {
								old_order.remove_orderline(l);
							} else if (l.order && typeof l.order.remove_orderline === 'function') {
								l.order.remove_orderline(l);
							}
						}
					}
				}

				for (const ol of orderlines) {
					addImportedLine(ol);
				}
				pruneAutoDiscounts();
				setTimeout(pruneAutoDiscounts, 0);
				setTimeout(pruneAutoDiscounts, 150);

				if(amount_due > 0 && order.amount_paid != 0)
				{
					let product_for_due = self.env.pos.config.partial_product_id;
					if(product_for_due)
					{
						let prd = self.env.pos.db.get_product_by_id(product_for_due[0]);
						old_order.add_product(prd,{
							quantity: 1.0,
							price: -order.amount_paid,
							discount: 0,
							merge: false,
							is_saved: true,
							extras: {
								price_manually_set: true,
								_loaded_from_saved_order: true,
							},
						});

						const lineDue = old_order.get_last_orderline();
						if (lineDue) {
							if (typeof lineDue.set_unit_price === 'function') lineDue.set_unit_price(-order.amount_paid);
							else lineDue.price = -order.amount_paid;
							lineDue.price_manually_set = true;
							if (typeof lineDue.set_price_manually === 'function') lineDue.set_price_manually(true);

							lineDue._loaded_from_saved_order = true;
							lineDue._loaded_signature = `partial|${order.id}|${order.amount_paid}`;
							if (typeof lineDue.set_is_reward_line === 'function') lineDue.set_is_reward_line(false);
						}

						pruneAutoDiscounts();
						setTimeout(pruneAutoDiscounts, 0);
						setTimeout(pruneAutoDiscounts, 150);
					}
					else{
						return self.showPopup('ErrorPopup', {
							title: self.env._t('Configure Product'),
							body: self.env._t('Please configure partial product.'),
						});
					}
				}
				if(old_order.orderlines.length > 0){
					self.trigger('close-temp-screen');
					self.showScreen('PaymentScreen');			
				}
			}

		}
		
	Registries.Component.extend(POSOrdersScreen, PayPOSOrdersScreen);

	return POSOrdersScreen;
});


