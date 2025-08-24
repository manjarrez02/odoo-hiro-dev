odoo.define('pos_all_in_one.UnpaidOrderSearchButton', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const { useListener } = require("@web/core/utils/hooks");
	const Registries = require('point_of_sale.Registries');
	const POSOrdersScreen= require('pos_orders_all.POSOrdersScreen');


	class UnpaidOrderSearchButton extends PosComponent {
		setup() {
			super.setup();
			useListener('click', this.onClick);
		}

		remove_current_orderlines(){
			let self = this;
			let order = self.env.pos.get_order();
			let orderlines = order.get_orderlines();
			order.set_partner(null);           
			while (orderlines.length > 0) {
				orderlines.forEach(function (line) {
					order.remove_orderline(line);
				});
			}
		}

		get_current_day() {
			let today = new Date();
			let dd = today.getDate();
			let mm = today.getMonth()+1; //January is 0!
			let yyyy = today.getFullYear();
			if(dd<10){
				dd='0'+dd;
			} 
			if(mm<10){
				mm='0'+mm;
			} 
			today = yyyy+'-'+mm+'-'+dd;
			return today;
		}
			
		async onClick() {
			let self = this;
			const PosOrder = new (Registries.Component.get(POSOrdersScreen))(this, {
				'selected_partner_id': false 
			});

			let selectedOrder = self.env.pos.get_order();
			let partner_id = false;
			let client = false;

			if (selectedOrder.get_orderlines().length > 0) {
				const { confirmed } = await this.showPopup('PosOrdersDetailRestric', {});
				if (!confirmed) return;
			}

			let load_orders = [];
			let order_ids = [];

			const output = await self.rpc({
				model: 'pos.order',
				method: 'search_read',
				args: [[['state', 'in', ['draft', 'done', 'invoiced']], ['session_id', '=', self.env.pos.pos_session.id]]],
			});

			if (self.env.pos.config.pos_session_limit === 'current_day') {
				let today = self.get_current_day();
				load_orders = output.filter(i => (
					i.date_order >= `${today} 00:00:00` && i.date_order <= `${today} 23:59:59`
				));
			} else {
				load_orders = output;
			}

			// Limpieza previa
			self.env.pos.db.get_orders_by_id = {};
			self.env.pos.db.get_orders_by_barcode = {};
			self.env.pos.db.get_orders_by_order_ref = {};

			load_orders.forEach(order => {
				order_ids.push(order.id);
				self.env.pos.db.get_orders_by_id[order.id] = order;
				self.env.pos.db.get_orders_by_barcode[order.barcode] = order;
				self.env.pos.db.get_orders_by_order_ref[order.name] = order;
			});

			const { confirmed, payload: inputNote } = await this.showPopup('TextInputPopup', {
				title: this.env._t('Find Order Using Barcode or Order Ref'),
			});
			if (!confirmed) return;

			let entered_barcode = inputNote;
			let order = self.env.pos.db.get_orders_by_barcode[entered_barcode] || self.env.pos.db.get_orders_by_order_ref[entered_barcode];

			if (!order) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Invalid Barcode'),
					body: self.env._t("No Order Found for this Barcode"),
				});
			}

			if (order.state !== "draft") {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('This order is already paid!'),
				});
			}

			const tryLoadOrderLines = async (retry = 0) => {
				let fields_domain = [['order_id', '=', order.id]];
				let lines = await self.rpc({
					model: 'pos.order.line',
					method: 'search_read',
					args: [fields_domain],
				});

				// Mapear por ID para uso rápido
				let orderlines_by_id = {};
				lines.forEach(ol => orderlines_by_id[ol.id] = ol);
				self.env.pos.db.get_orderline_by_id = orderlines_by_id;

				// Validar consistencia total
				let expected_total = lines.reduce((acc, ol) => acc + (ol.qty * ol.price_unit * (1 - (ol.discount || 0) / 100)), 0);
				let difference = Math.abs(expected_total - order.amount_total);

				if (lines.length !== order.lines.length || difference > 0.1) {
					if (retry < 2) {
						console.warn(`Reintentando carga de líneas: intento ${retry + 1}`);
						return await tryLoadOrderLines(retry + 1);
					}
					return { lines: null, error: true };
				}
				return { lines, error: false };
			};

			let { lines: loaded_lines, error } = await tryLoadOrderLines();
			if (error || !Array.isArray(order.lines)) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Carga Incompleta'),
					body: self.env._t('No fue posible recuperar todas las líneas de esta orden. Intente nuevamente.'),
				});
			}

			// Limpiar todas las líneas de la orden actual
			selectedOrder.get_orderlines().forEach(function(line) {
				selectedOrder.remove_orderline(line);
			});

			let amount_due = order.amount_total - order.amount_paid;
			let orderlines = [];

			order.lines.forEach(line_id => {
				let ol = self.env.pos.db.get_orderline_by_id[line_id];
				if (ol) orderlines.push(ol);
			});

			if (orderlines.length > 0) {
				selectedOrder.name = order.pos_reference;
				selectedOrder.is_partial = order.is_partial;
				selectedOrder.amount_due = amount_due;
				selectedOrder.barcode = order.barcode;
				selectedOrder.barcode_img = order.barcode_img;
				selectedOrder.is_paying_partial = true;
				selectedOrder.amount_paid = order.amount_paid;
			}

			if (order.partner_id) {
				let client = self.env.pos.db.get_partner_by_id(order.partner_id[0]);
				selectedOrder.set_partner(client);
			}

			/* ================================
			* (A) HELPERS: carga + poda
			* ================================ */
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

				const qty = parseFloat(ol.qty) || 0;
				const unitPrice = parseFloat(ol.price_unit) || 0;
				const discount = isNaN(parseFloat(ol.discount)) ? 0 : parseFloat(ol.discount);

				const isDiscountLine = unitPrice < 0;

				selectedOrder.add_product(product, {
					quantity: qty,
					price: isDiscountLine ? 0 : unitPrice,
					discount: isDiscountLine ? 0 : discount,
					merge: false,
					is_saved: true,
				});

				const line = selectedOrder.get_last_orderline();
				if (line) {
					// Fijar precio manual para evitar recálculos/promos
					if (typeof line.set_unit_price === 'function') line.set_unit_price(unitPrice);
					else line.price = unitPrice;

					line.price_manually_set = true;
					if (typeof line.set_price_manually === 'function') line.set_price_manually(true);

					// Marcas para distinguir tus líneas
					line._loaded_from_saved_order = true;
					line._loaded_signature = makeLineSignature(ol);

					// Por si tu versión soporta este flag y evita promos
					if (typeof line.set_is_reward_line === 'function') line.set_is_reward_line(false);
				}
			}

			function pruneAutoDiscounts() {
				const lines = selectedOrder.get_orderlines();
				for (const l of [...lines]) {
					const isMine = !!l._loaded_from_saved_order;

					const unitPrice = typeof l.get_unit_price === 'function'
						? l.get_unit_price()
						: (l.price || 0);

					const pctDiscount = typeof l.get_discount === 'function'
						? parseFloat(l.get_discount()) || 0
						: parseFloat(l.discount) || 0;

					// PROPIEDAD booleana: l.is_reward_line
					const isReward = l.is_reward_line === true;

					const looksLikeAutoDiscount =
						(!isMine && isReward) ||     // recompensa/promoción autogenerada
						(!isMine && unitPrice < 0) ||// línea negativa no importada
						(!isMine && pctDiscount !== 0); // % descuento ajeno a lo importado

					if (looksLikeAutoDiscount) {
						if (typeof selectedOrder.remove_orderline === 'function') {
							selectedOrder.remove_orderline(l);
						} else if (l.order && typeof l.order.remove_orderline === 'function') {
							l.order.remove_orderline(l);
						}
					}
				}
			}

			/* ============================================
			* (B) REEMPLAZO DEL BUCLE DE AGREGAR LÍNEAS
			* ============================================ */
			for (const ol of orderlines) {
				addImportedLine(ol);
			}
			// Poda inmediata y diferida por si el motor de promos recalcula
			pruneAutoDiscounts();
			setTimeout(pruneAutoDiscounts, 0);
			setTimeout(pruneAutoDiscounts, 150);

			/* ============================================
			* (C) ABONO PARCIAL → AGREGAR PRODUCTO Y PODAR
			* ============================================ */
			if (amount_due > 0 && order.amount_paid != 0) {
				let product_for_due = self.env.pos.config.partial_product_id;
				if (product_for_due) {
					let prd = self.env.pos.db.get_product_by_id(product_for_due[0]);
					selectedOrder.add_product(prd, {
						quantity: 1.0,
						price: -order.amount_paid,
						discount: 0,
						merge: false,
						is_saved: true,
					});

					// Fijar precio manual del abono para que no se toque
					const lineDue = selectedOrder.get_last_orderline();
					if (lineDue) {
						if (typeof lineDue.set_unit_price === 'function') lineDue.set_unit_price(-order.amount_paid);
						else lineDue.price = -order.amount_paid;
						lineDue.price_manually_set = true;
						if (typeof lineDue.set_price_manually === 'function') lineDue.set_price_manually(true);

						// Marcarla como "nuestra" para que la poda no la quite
						lineDue._loaded_from_saved_order = true;
						lineDue._loaded_signature = `partial|${order.id}|${order.amount_paid}`;
						if (typeof lineDue.set_is_reward_line === 'function') lineDue.set_is_reward_line(false);
					}

					// Poda nuevamente por si el abono dispara promos
					pruneAutoDiscounts();
					setTimeout(pruneAutoDiscounts, 0);
					setTimeout(pruneAutoDiscounts, 150);
				} else {
					return self.showPopup('ErrorPopup', {
						title: self.env._t('Configure Product'),
						body: self.env._t('Please configure partial product.'),
					});
				}
			}

			if (amount_due > 0 && order.amount_paid != 0) {
				let product_for_due = self.env.pos.config.partial_product_id;
				if (product_for_due) {
					let prd = self.env.pos.db.get_product_by_id(product_for_due[0]);
					selectedOrder.add_product(prd, {
						quantity: 1.0,
						price: -order.amount_paid,
						discount: 0
					});
				} else {
					return self.showPopup('ErrorPopup', {
						title: self.env._t('Configure Product'),
						body: self.env._t('Please configure partial product.'),
					});
				}
			}

			if (selectedOrder.orderlines.length > 0) {
				self.showScreen('PaymentScreen');
			}
		}



	}
	UnpaidOrderSearchButton.template = 'UnpaidOrderSearchButton';

	ProductScreen.addControlButton({
		component: UnpaidOrderSearchButton,
		condition: function() {
			if(!this.env.pos.config.module_pos_hr && this.env.pos.user.is_allow_find_order){
				if(this.env.pos.config.allow_partical_payment){
					return true
				}else{
					return true
				}
			}
			if(this.env.pos.config.module_pos_hr && this.env.pos.cashier.is_allow_find_order){
				if(this.env.pos.config.allow_partical_payment){
					return true
				}else{
					return true
				}
			}
		},
	});

	Registries.Component.add(UnpaidOrderSearchButton);

	return UnpaidOrderSearchButton;
});
