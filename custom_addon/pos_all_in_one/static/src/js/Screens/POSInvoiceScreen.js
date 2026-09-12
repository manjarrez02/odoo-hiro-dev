odoo.define('pos_all_in_one.POSInvoiceScreen', function (require) {
	'use strict';

	const { debounce } = require("@web/core/utils/timing");
	const PosComponent = require('point_of_sale.PosComponent');
	const Registries = require('point_of_sale.Registries');
	const { useListener } = require("@web/core/utils/hooks");
	const { onWillStart, onWillUnmount, useRef, useState } = owl;
	let core = require('web.core');
	let _t = core._t;

	class POSInvoiceScreen extends PosComponent {
		setup() {
			super.setup();
			this.state = useState({
				query: '',
				selectedPosOrder: null,
				filter_state: '',
				orders: [],
				loading: true,
			});
			useListener('click-showDetails', this.showDetails);
			this.searchWordInputRef = useRef('search-word-input-invoice');
			this.searchWordInput = this.searchWordInputRef;
			this.serverSearchDebounced = debounce(this._serverSearch.bind(this), 300);
			onWillUnmount(this.serverSearchDebounced.cancel);

			onWillStart(async () => {
				await this.load_invoices();
			});
		}

		get currentOrder() {
			return this.env.pos.get_order();
		}

		get orders() {
			return this.state.orders;
		}

		set orders(val) {
			this.state.orders = val || [];
		}

		get orderlines() {
			return [];
		}

		set orderlines(val) {
		}

		get pos_order_lines() {
			return [];
		}

		cancel() {
			this.trigger('close-temp-screen');
		}

		_clearSearch() {
			if (this.searchWordInputRef && this.searchWordInputRef.el) {
				this.searchWordInputRef.el.value = '';
			}
			this.state.query = '';
		}

		async _serverSearch(query) {
			query = (query || (this.searchWordInputRef && this.searchWordInputRef.el && this.searchWordInputRef.el.value) || this.state.query || '').trim();
			if (!query || query.length < 1) return;

			const search_domain = [
				'|', '|',
				['name', 'ilike', query],
				['ref', 'ilike', query],
				['partner_id', 'ilike', query]
			];

			search_domain.unshift(['move_type', 'in', ['out_invoice', 'out_refund']]);

			const pos_config = this.env.pos.config;
			const companyId = (this.env.pos.company && this.env.pos.company.id) || 
			                  (pos_config && pos_config.company_id && pos_config.company_id[0]);
			const allowedCompanies = (this.env.session && this.env.session.user_context && this.env.session.user_context.allowed_company_ids) || (companyId ? [companyId] : []);
			if (allowedCompanies.length > 0) {
				search_domain.unshift(['company_id', 'in', allowedCompanies.concat([false])]);
			}

			const fields = [
				'id', 'name', 'ref', 'partner_id', 'amount_total', 'amount_residual',
				'currency_id', 'state', 'payment_state', 'invoice_date', 'move_type'
			];

			try {
				const results = await this.rpc({
					model: 'account.move',
					method: 'search_read',
					args: [search_domain, fields, 0, 50, 'invoice_date desc, id desc'],
					kwargs: { context: this.env.session.user_context },
				});

				if (results && results.length > 0) {
					if (!this.env.pos.db.invoice_by_id) {
						this.env.pos.db.invoice_by_id = {};
					}
					const existingIds = new Set(this.state.orders.map(o => o.id));
					for (const inv of results) {
						if (!inv.partner_id) inv.partner_id = [false, ''];
						if (!inv.currency_id) inv.currency_id = [this.env.pos.currency.id, this.env.pos.currency.name];
						if (!inv.ref) inv.ref = '';
						if (!existingIds.has(inv.id)) {
							this.state.orders.unshift(inv);
							this.env.pos.db.invoice_by_id[inv.id] = inv;
						}
					}
				}
			} catch (err) {
				console.error("Error searching invoices from server:", err);
			}
		}

		async _onPressEnterKey() {
			this.serverSearchDebounced.cancel();
			const query = (this.searchWordInputRef && this.searchWordInputRef.el && this.searchWordInputRef.el.value) || this.state.query || '';
			await this._serverSearch(query);
		}

		updateOrderList(event) {
			const val = event.target.value;
			this.state.query = val;

			const isEnter = (event.key === 'Enter' || event.keyCode === 13 || event.which === 13 || event.code === 'Enter' || event.code === 'NumpadEnter');

			if (isEnter) {
				const currentMatches = this.invoices;
				if (currentMatches.length === 1) {
					this.state.selectedPosOrder = currentMatches[0];
				}
				this.serverSearchDebounced.cancel();
				this._serverSearch(val);
			} else if (val && val.trim().length >= 2) {
				this.serverSearchDebounced(val);
			}
		}

		get invoices() {
			let query = (this.state.query || '').trim().toLowerCase();
			let filter_state = this.state.filter_state;
			let allOrders = this.state.orders || [];

			let filtered = allOrders;

			if (filter_state === 'Partially Paid') {
				filtered = filtered.filter(odr => odr.payment_state === 'partial');
			} else if (filter_state === 'Not Paid') {
				filtered = filtered.filter(odr => odr.payment_state === 'not_paid');
			}

			if (query !== '') {
				filtered = this.search_orders(filtered, query);
			}

			if (this.props.selected_partner_id) {
				filtered = filtered.filter(odr => odr.partner_id && odr.partner_id[0] === this.props.selected_partner_id);
			}

			return filtered;
		}

		search_orders(orders, query) {
			if (!query) return orders || [];
			const search_text = query.toLowerCase();
			return (orders || []).filter(odr => {
				const name = odr.name ? String(odr.name).toLowerCase() : '';
				const ref = odr.ref ? String(odr.ref).toLowerCase() : '';
				const state = odr.state ? String(odr.state).toLowerCase() : '';
				const payment_state = odr.payment_state ? String(odr.payment_state).toLowerCase() : '';
				const partnerName = (odr.partner_id && odr.partner_id[1]) ? String(odr.partner_id[1]).toLowerCase() : '';

				return name.includes(search_text) || 
				       ref.includes(search_text) || 
				       state.includes(search_text) || 
				       payment_state.includes(search_text) || 
				       partnerName.includes(search_text);
			});
		}

		invoicedFilter() {
			if (this.state.filter_state === 'Partially Paid') {
				this.state.filter_state = '';
			} else {
				this.state.filter_state = 'Partially Paid';
			}
		}

		notPaidFilter() {
			if (this.state.filter_state === 'Not Paid') {
				this.state.filter_state = '';
			} else {
				this.state.filter_state = 'Not Paid';
			}
		}

		async refresh_orders() {
			if (this.searchWordInputRef && this.searchWordInputRef.el) {
				this.searchWordInputRef.el.value = '';
			}
			this.state.query = '';
			this.state.filter_state = '';
			this.props.selected_partner_id = false;
			await this.load_invoices();
		}

		clickPosOrder(order) {
			if (this.state.selectedPosOrder === order) {
				this.state.selectedPosOrder = null;
			} else {
				this.state.selectedPosOrder = order;
			}
			this.showDetails(order);
		}

		get_current_day() {
			let today = new Date();
			let dd = today.getDate();
			let mm = today.getMonth() + 1;
			let yyyy = today.getFullYear();
			if (dd < 10) dd = '0' + dd;
			if (mm < 10) mm = '0' + mm;
			return yyyy + '-' + mm + '-' + dd;
		}

		get_inv_domain() {
			let domain = [
				['state', '=', 'posted'],
				['move_type', 'in', ['out_invoice', 'out_refund']],
				['payment_state', '!=', 'paid']
			];

			const pos_config = this.env.pos.config;
			const companyId = (this.env.pos.company && this.env.pos.company.id) || 
			                  (pos_config && pos_config.company_id && pos_config.company_id[0]);
			if (companyId) {
				domain.push(['company_id', '=', companyId]);
			}
			return domain;
		}

		async load_invoices() {
			const inv_domain = this.get_inv_domain();
			const fields = [
				'id', 'name', 'ref', 'partner_id', 'amount_total', 'amount_residual',
				'currency_id', 'state', 'payment_state', 'invoice_date', 'move_type'
			];

			try {
				const output = await this.rpc({
					model: 'account.move',
					method: 'search_read',
					args: [inv_domain, fields, 0, 100, 'invoice_date desc, id desc'],
					kwargs: { context: this.env.session.user_context },
				});

				const invoices = output || [];
				if (!this.env.pos.db.invoice_by_id) {
					this.env.pos.db.invoice_by_id = {};
				}
				for (const inv of invoices) {
					if (!inv.partner_id) inv.partner_id = [false, ''];
					if (!inv.currency_id) inv.currency_id = [this.env.pos.currency.id, this.env.pos.currency.name];
					if (!inv.ref) inv.ref = '';
					this.env.pos.db.invoice_by_id[inv.id] = inv;
				}
				this.state.orders = invoices;
			} catch (error) {
				console.error("Error loading invoices in POS:", error);
				this.state.orders = [];
				if (error && error.message && error.message.code < 0) {
					await this.showPopup('OfflineErrorPopup', {
						title: this.env._t('Offline'),
						body: this.env._t('Unable to load invoices.'),
					});
				}
			} finally {
				this.state.loading = false;
			}
		}

		async get_invoices() {
			await this.load_invoices();
			return [this.state.orders, []];
		}

		async showDetails(invoices) {
			const order = (invoices && invoices.detail) ? invoices.detail : invoices;
			if (!order || !order.id) return;

			let pos_lines = [];
			try {
				pos_lines = await this.rpc({
					model: 'account.move.line',
					method: 'search_read',
					args: [[['move_id', '=', order.id]], ['id', 'name', 'move_id', 'price_unit', 'quantity', 'price_subtotal']],
					kwargs: { context: this.env.session.user_context },
				});
			} catch (e) {
				console.warn("Could not load invoice lines on demand:", e);
			}

			this.showPopup('PosInvoiceDetail', {
				'order': order, 
				'orderline': pos_lines || [],
			});
		}

		registerPayment(invoice) {
			this.showPopup('RegisterInvoicePaymentPopupWidget', { 'invoice': invoice });
		}

		async register_payment() {
			const partner_id = this.state.selectedPosOrder;
			if (!partner_id) {
				this.showPopup('ErrorPopup', {
					'title': _t('Unknown customer'),
					'body': _t('You cannot Register Payment. Select Invoice first.'),
				});
				return false;
			}
			this.showPopup('RegisterPaymentPopupWidget', { 'invoice': partner_id });
		}
	}

	POSInvoiceScreen.template = 'POSInvoiceScreen';
	POSInvoiceScreen.hideOrderSelector = true;
	Registries.Component.add(POSInvoiceScreen);
	return POSInvoiceScreen;
});
