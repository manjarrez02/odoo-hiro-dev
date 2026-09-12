odoo.define('pos_orders_all.SaleOrderScreen', function (require) {
	'use strict';

	const { debounce } = require("@web/core/utils/timing");
	const PosComponent = require('point_of_sale.PosComponent');
	const Registries = require('point_of_sale.Registries');
	const { useListener } = require("@web/core/utils/hooks");
	const { onWillStart, onWillUnmount, useRef, useState } = owl;

	class SaleOrderScreen extends PosComponent {
		setup() {
			super.setup();
			this.state = useState({
				query: '',
				selectedSaleOrder: this.props.partner || null,
				orders: [],
				loading: true,
			});
			useListener('click-importSale', this.importSale);
			useListener('click-showDetails', this.showDetails);
			this.searchWordInputRef = useRef('search-word-input-partner');
			this.serverSearchDebounced = debounce(this._serverSearch.bind(this), 300);
			onWillUnmount(this.serverSearchDebounced.cancel);

			onWillStart(async () => {
				await this.load_sale_orders();
			});
		}

		get saleorders() {
			return this.state.orders;
		}

		set saleorders(val) {
			this.state.orders = val || [];
		}

		get so_lines() {
			return [];
		}

		set so_lines(val) {
		}

		back() {
			this.trigger('close-temp-screen');
		}

		get sale_orders() {
			let query = (this.state.query || '').trim().toLowerCase();
			const allOrders = this.state.orders || [];
			if (query !== '') {
				return this.search_orders(allOrders, query);
			}
			return allOrders;
		}

		async get_order_lines(order_id) {
			if (!this.env.pos.db.get_so_lines_by_order_id) {
				this.env.pos.db.get_so_lines_by_order_id = {};
			}
			if (this.env.pos.db.get_so_lines_by_order_id[order_id]) {
				return this.env.pos.db.get_so_lines_by_order_id[order_id];
			}
			const line_fields = ['id', 'order_id', 'product_id', 'product_uom_qty', 'price_unit', 'discount', 'price_subtotal'];
			try {
				const lines = await this.rpc({
					model: 'sale.order.line',
					method: 'search_read',
					args: [[['order_id', '=', order_id]], line_fields],
					kwargs: { context: this.env.session.user_context },
				});
				this.env.pos.db.get_so_lines_by_order_id[order_id] = lines || [];
				if (!this.env.pos.db.get_so_line_by_id) {
					this.env.pos.db.get_so_line_by_id = {};
				}
				for (const l of lines) {
					this.env.pos.db.get_so_line_by_id[l.id] = l;
				}
				return lines || [];
			} catch (err) {
				console.error("Error loading order lines on demand:", err);
				return [];
			}
		}

		async importSale({ detail: order }) {
			const o_id = parseInt(order.id);
			const pos_lines = await this.get_order_lines(o_id);
			this.showPopup('ImportSaleOrder', {
				'order': order, 
				'orderlines': pos_lines,
			});
		}

		async showDetails({ detail: order }) {
			const o_id = parseInt(order.id);
			const pos_lines = await this.get_order_lines(o_id);
			this.showPopup('SODetail', {
				'order': order, 
				'orderline': pos_lines,
			});
		}

		search_orders(saleorders, query) {
			if (!query) return saleorders || [];
			const search_text = query.toLowerCase();
			return (saleorders || []).filter(odr => {
				const name = odr.name ? String(odr.name).toLowerCase() : '';
				const state = odr.state ? String(odr.state).toLowerCase() : '';
				const user = (odr.user_id && odr.user_id[1]) ? String(odr.user_id[1]).toLowerCase() : '';
				const partner = (odr.partner_id && odr.partner_id[1]) ? String(odr.partner_id[1]).toLowerCase() : '';
				const clientRef = odr.client_order_ref ? String(odr.client_order_ref).toLowerCase() : '';
				return name.includes(search_text) || 
				       state.includes(search_text) || 
				       user.includes(search_text) || 
				       partner.includes(search_text) ||
				       clientRef.includes(search_text);
			});
		}

		async refresh_orders() {
			if (this.searchWordInputRef && this.searchWordInputRef.el) {
				this.searchWordInputRef.el.value = '';
			}
			$('.input-search-saleorders').val('');
			this.state.query = '';
			await this.load_sale_orders();
		}

		async _serverSearch(query) {
			query = (query || (this.searchWordInputRef.el && this.searchWordInputRef.el.value) || this.state.query || '').trim();
			if (!query || query.length < 1) return;

			const search_domain = [
				'|', '|',
				['name', 'ilike', query],
				['partner_id', 'ilike', query],
				['client_order_ref', 'ilike', query]
			];

			const pos_config = this.env.pos.config;
			const companyId = (this.env.pos.company && this.env.pos.company.id) || 
			                  (pos_config && pos_config.company_id && pos_config.company_id[0]);
			const allowedCompanies = (this.env.session && this.env.session.user_context && this.env.session.user_context.allowed_company_ids) || (companyId ? [companyId] : []);
			if (allowedCompanies.length > 0) {
				search_domain.unshift(['company_id', 'in', allowedCompanies.concat([false])]);
			}

			const fields = [
				'id', 'name', 'date_order', 'partner_id', 'user_id',
				'amount_untaxed', 'amount_total', 'state', 'company_id', 'client_order_ref'
			];

			try {
				const results = await this.rpc({
					model: 'sale.order',
					method: 'search_read',
					args: [search_domain, fields, 0, 50, 'date_order desc, id desc'],
					kwargs: { context: this.env.session.user_context },
				});

				if (results && results.length > 0) {
					const existingIds = new Set(this.state.orders.map(o => o.id));
					for (const o of results) {
						if (!o.partner_id) o.partner_id = [false, ''];
						if (!o.user_id) o.user_id = [false, ''];
						if (!existingIds.has(o.id)) {
							this.state.orders.unshift(o);
							this.env.pos.db.get_so_by_id[o.id] = o;
						}
					}
				}
			} catch (err) {
				console.error("Error searching sale orders from server:", err);
			}
		}

		async _onPressEnterKey() {
			this.serverSearchDebounced.cancel();
			const query = (this.searchWordInputRef.el && this.searchWordInputRef.el.value) || this.state.query || '';
			await this._serverSearch(query);
		}

		updateOrderList(event) {
			const val = event.target.value;
			this.state.query = val;

			const isEnter = (event.key === 'Enter' || event.keyCode === 13 || event.which === 13 || event.code === 'Enter' || event.code === 'NumpadEnter');

			if (isEnter) {
				const currentMatches = this.sale_orders;
				if (currentMatches.length === 1) {
					this.state.selectedSaleOrder = currentMatches[0];
				}
				this.serverSearchDebounced.cancel();
				this._serverSearch(val);
			} else if (val && val.trim().length >= 2) {
				this.serverSearchDebounced(val);
			}
		}

		_clearSearch() {
			if (this.searchWordInputRef && this.searchWordInputRef.el) {
				this.searchWordInputRef.el.value = '';
			}
			this.state.query = '';
		}

		clickSaleOrder(order) {
			if (this.state.selectedSaleOrder === order) {
				this.state.selectedSaleOrder = null;
			} else {
				this.state.selectedSaleOrder = order;
			}
		}

		get_current_day() {
			let self = this; 
			let days = self.env.pos.config.load_orders_days;
			let today = new Date();
			if (days > 0) {	
				today.setDate(today.getDate() - days);
			}
			let dd = today.getDate();
			let mm = today.getMonth() + 1;
			let yyyy = today.getFullYear();
			if (dd < 10) dd = '0' + dd;
			if (mm < 10) mm = '0' + mm;
			return yyyy + '-' + mm + '-' + dd;
		}

		get_orders_domain() {
			let pos_config = this.env.pos.config;
			let today = this.get_current_day();
			let days = pos_config.load_orders_days;
			let is_draft_sent = pos_config.load_draft_sent;
			let domain = [];

			const companyId = (this.env.pos.company && this.env.pos.company.id) || 
			                  (pos_config.company_id && pos_config.company_id[0]);
			if (companyId) {
				domain.push(['company_id', '=', companyId]);
			}

			if (days > 0) {	
				domain.push(['date_order', '>=', today]);
				if (is_draft_sent) {
					domain.push(['state', 'in', ['draft', 'sent']]);
				} else {
					domain.push(['state', 'not in', ['cancel']]);
				}
			} else {
				if (is_draft_sent) {
					domain.push(['state', 'in', ['draft', 'sent']]);
				} else {
					domain.push(['state', 'not in', ['cancel']]);
				}
			}
			return domain;
		}

		async load_sale_orders() {
			const sale_domain = this.get_orders_domain();
			const fields = [
				'id', 'name', 'date_order', 'partner_id', 'user_id',
				'amount_untaxed', 'amount_total', 'state', 'company_id', 'client_order_ref'
			];
			try {
				const output = await this.rpc({
					model: 'sale.order',
					method: 'search_read',
					args: [sale_domain, fields, 0, 100, 'date_order desc, id desc'],
					kwargs: { context: this.env.session.user_context },
				});
				const orders = output || [];
				if (!this.env.pos.db.get_so_by_id) {
					this.env.pos.db.get_so_by_id = {};
				}
				for (const order of orders) {
					if (!order.partner_id) order.partner_id = [false, ''];
					if (!order.user_id) order.user_id = [false, ''];
					this.env.pos.db.get_so_by_id[order.id] = order;
				}
				this.state.orders = orders;
			} catch (error) {
				console.error("Error loading sale orders in POS:", error);
				this.state.orders = [];
				if (error && error.message && error.message.code < 0) {
					await this.showPopup('OfflineErrorPopup', {
						title: this.env._t('Offline'),
						body: this.env._t('Unable to load sale orders.'),
					});
				}
			} finally {
				this.state.loading = false;
			}
		}

		async get_sale_orders() {
			await this.load_sale_orders();
			return [this.state.orders, []];
		}
	}

	SaleOrderScreen.template = 'SaleOrderScreen';
	SaleOrderScreen.hideOrderSelector = true;
	Registries.Component.add(SaleOrderScreen);
	return SaleOrderScreen;
});
