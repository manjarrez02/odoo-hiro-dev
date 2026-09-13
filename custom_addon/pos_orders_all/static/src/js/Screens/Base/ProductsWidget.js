// BiProductScreen js
odoo.define('pos_orders_all.ProductsWidget', function(require) {
	"use strict";

	const ProductsWidget = require('point_of_sale.ProductsWidget');
	const Registries = require('point_of_sale.Registries');
	const { useBus } = require("@web/core/utils/hooks");
	const { Product } = require('point_of_sale.models');

	function setupGlobalBusListener(env) {
		if (window.__pos_sync_product_bus_registered) {
			return;
		}
		if (!env || !env.services || !env.services.bus_service) {
			return;
		}

		window.__pos_sync_product_bus_registered = true;

		env.services.bus_service.addEventListener('notification', ({ detail: notifications }) => {
			if (!notifications || !notifications.length) return;

			let productsUpdated = false;

			notifications.forEach(ntf => {
				if (ntf && ntf.type === "product.product/sync_data") {
					const prodList = ntf.payload && ntf.payload.product;
					if (!prodList || !prodList.length) return;
					const prod = prodList[0];
					if (!prod || !prod.id) return;

					const old_prod = env.pos.db.product_by_id[prod.id];
					if (old_prod) {
						if (prod.qty_available !== undefined) old_prod.qty_available = prod.qty_available;
						if (prod.virtual_available !== undefined) old_prod.virtual_available = prod.virtual_available;
						if (prod.bi_qty_available !== undefined) old_prod.bi_qty_available = prod.bi_qty_available;
						if (prod.bi_virtual_available !== undefined) old_prod.bi_virtual_available = prod.bi_virtual_available;
						if (prod.quant_text !== undefined) old_prod.quant_text = prod.quant_text;

						delete old_prod._parsed_quant_text;
						delete old_prod.base_qty_available;
						delete old_prod.base_virtual_available;
						if (prod.categ) old_prod.categ = prod.categ;

						const new_prod = Object.assign(Object.create(Object.getPrototypeOf(old_prod)), old_prod);
						env.pos.db.product_by_id[new_prod.id] = new_prod;
						productsUpdated = true;
					} else {
						prod.product_tmpl_id = Array.isArray(prod.product_tmpl_id) ? prod.product_tmpl_id[0] : prod.product_tmpl_id;
						prod.pos = env.pos;
						const new_prod = Product.create(prod);
						new_prod.applicablePricelistItems = {};
						if (env.pos.pricelists) {
							for (let pricelist of env.pos.pricelists) {
								for (const pricelistItem of pricelist.items) {
									if (pricelistItem.product_id && pricelistItem.product_id[0] === new_prod.id) {
										env.pos._assignApplicableItems(pricelist, new_prod, pricelistItem);
									} else if (pricelistItem.product_tmpl_id && pricelistItem.product_tmpl_id[0] === new_prod.product_tmpl_id) {
										env.pos._assignApplicableItems(pricelist, new_prod, pricelistItem);
									}
								}
							}
						}
						env.pos.db.product_by_id[new_prod.id] = new_prod;
						productsUpdated = true;
					}
				} else if (ntf && ntf.type === "res.partner/sync_data") {
					const partner = ntf.payload && ntf.payload.partner;
					if (partner && env.pos.addPartners) {
						partner.pos = env.pos;
						env.pos.addPartners([partner]);
					}
				}
			});

			if (productsUpdated && env.posbus) {
				env.posbus.trigger('sync-product-update');
			}
		});
	}

	const BiProductsWidget = (ProductsWidget) =>
		class extends ProductsWidget {
			setup() {
				super.setup();
				setupGlobalBusListener(this.env);
				// useBus administra el registro y desregistro de forma limpia en el ciclo de vida OWL
				useBus(this.env.posbus, 'sync-product-update', () => this.render(true));
			}

			get is_sync() {
				return this.env.pos.is_sync;
			}

			get productsToDisplay() {
				let self = this;
				let prods = super.productsToDisplay;
				if (!prods || !prods.length) {
					return prods || [];
				}

				let order = self.env.pos.get_order();
				let config = self.env.pos.config;
				let config_loc = config.stock_location_id;
				let isSpecific = config.show_stock_location === 'specific';
				let cfg_loc_id = (config_loc && config_loc[0]) ? config_loc[0] : null;
				let stockType = config.pos_stock_type;

				// Pre-calcular cantidades en el carrito en O(1)
				const cartQuantities = {};
				if (order) {
					const lines = order.get_orderlines() || [];
					for (let l = 0; l < lines.length; l++) {
						const line = lines[l];
						if (line && line.product && line.product.id) {
							cartQuantities[line.product.id] = (cartQuantities[line.product.id] || 0) + (line.get_quantity() || 0);
						}
					}
				}

				for (let i = 0; i < prods.length; i++) {
					const prd = prods[i];
					const reserved_qty = cartQuantities[prd.id] || 0;

					if (isSpecific && cfg_loc_id) {
						let base_qty = 0;
						let base_virtual = 0;

						if (prd.quant_text) {
							if (prd._parsed_quant_text === undefined) {
								try {
									prd._parsed_quant_text = typeof prd.quant_text === 'string' ? JSON.parse(prd.quant_text) : prd.quant_text;
								} catch (e) {
									prd._parsed_quant_text = null;
								}
							}
							const loc_data = prd._parsed_quant_text;
							if (loc_data) {
								const v = loc_data[cfg_loc_id] || loc_data[String(cfg_loc_id)];
								if (Array.isArray(v)) {
									base_qty = v[0] || 0;
									base_virtual = (v[0] || 0) + (v[2] || 0) - (v[1] || 0);
								} else if (typeof v === 'number') {
									base_qty = v;
									base_virtual = v;
								}
							}
						} else {
							base_qty = prd.base_qty_available !== undefined ? prd.base_qty_available : (prd.qty_available || 0);
							base_virtual = prd.base_virtual_available !== undefined ? prd.base_virtual_available : (prd.virtual_available || base_qty);
						}

						if (stockType === 'onhand') {
							prd['qty_available'] = base_qty - reserved_qty;
						} else if (stockType === 'virtual') {
							prd['virtual_available'] = base_virtual - reserved_qty;
						} else if (stockType === 'both') {
							prd['qty_available'] = base_qty - reserved_qty;
							prd['virtual_available'] = base_virtual - reserved_qty;
						}
					} else {
						if (prd.base_qty_available === undefined) {
							prd.base_qty_available = prd.qty_available || 0;
							prd.base_virtual_available = prd.virtual_available || prd.base_qty_available;
						}
						let base_qty = prd.base_qty_available;
						let base_virtual = prd.base_virtual_available;
						prd['bi_qty_available'] = base_qty - reserved_qty;
						prd['bi_virtual_available'] = base_virtual - reserved_qty;
					}
				}

				return prods;
			}

			syncProdData(notifications) {
				// Delegar a Chrome si se invoca directamente
				if (this.env.posbus) {
					this.env.posbus.trigger('sync-product-update');
				}
			}

			updateProd(product) {
				const old_prod = this.env.pos.db.product_by_id[product.id];
				if (old_prod) {
					const new_prod = Object.assign(Object.create(Object.getPrototypeOf(old_prod)), old_prod, {
						qty_available: product.qty_available,
						virtual_available: product.virtual_available,
						bi_qty_available: product.bi_qty_available,
						bi_virtual_available: product.bi_virtual_available,
						quant_text: product.quant_text,
					});
					delete new_prod._parsed_quant_text;
					delete new_prod.base_qty_available;
					delete new_prod.base_virtual_available;
					this.env.pos.db.product_by_id[new_prod.id] = new_prod;
					return new_prod;
				}
				return product;
			}
		};

	Registries.Component.extend(ProductsWidget, BiProductsWidget);

	return ProductsWidget;
});
