odoo.define('pos_orders_all.Chrome', function(require) {
	'use strict';

	const Chrome = require('point_of_sale.Chrome');
	const Registries = require('point_of_sale.Registries');
	const { Product } = require('point_of_sale.models');

	const BiChrome = (Chrome) =>
		class extends Chrome {
			setup() {
				super.setup();
				if (!window.__pos_sync_product_bus_registered && this.env.services && this.env.services.bus_service) {
					window.__pos_sync_product_bus_registered = true;
					this.env.services.bus_service.addEventListener('notification', ({ detail: notifications }) => {
						this._onSyncDataNotification(notifications);
					});
				}
			}

			get is_stock_sync() {
				if (this.env && this.env.pos && this.env.pos.config && this.env.pos.config.show_stock_location == 'specific') {
					return true;
				} else {
					return false;
				}
			}

			_onSyncDataNotification(notifications) {
				const self = this;
				if (!notifications || !notifications.length) return;

				const filtered = notifications.filter(ntf =>
					ntf && ntf.type && (
						ntf.type === "product.product/sync_data" ||
						ntf.type === "res.partner/sync_data"
					)
				);
				if (!filtered.length) return;

				let productsUpdated = false;

				filtered.forEach(ntf => {
					if (ntf.type === "product.product/sync_data") {
						const prodList = ntf.payload && ntf.payload.product;
						if (!prodList || !prodList.length) return;
						const prod = prodList[0];
						if (!prod || !prod.id) return;

						const old_prod = self.env.pos.db.product_by_id[prod.id];
						if (old_prod) {
							// Preservar métodos del modelo Product de Odoo clonando prototipo
							const new_prod = Object.assign(Object.create(Object.getPrototypeOf(old_prod)), old_prod);

							// Actualizar campos de stock si están presentes en la notificación
							if (prod.qty_available !== undefined) new_prod.qty_available = prod.qty_available;
							if (prod.virtual_available !== undefined) new_prod.virtual_available = prod.virtual_available;
							if (prod.bi_qty_available !== undefined) new_prod.bi_qty_available = prod.bi_qty_available;
							if (prod.bi_virtual_available !== undefined) new_prod.bi_virtual_available = prod.bi_virtual_available;
							if (prod.quant_text !== undefined) new_prod.quant_text = prod.quant_text;

							delete new_prod._parsed_quant_text;
							delete new_prod.base_qty_available;
							delete new_prod.base_virtual_available;
							if (prod.categ) new_prod.categ = prod.categ;
							if (prod.pos_categ_id) new_prod.pos_categ_id = prod.pos_categ_id;

							// Mantener categorías de forma segura
							const stored_categories = self.env.pos.db.product_by_category_id;
							const new_cat_id = prod.pos_categ_id ? (Array.isArray(prod.pos_categ_id) ? prod.pos_categ_id[0] : prod.pos_categ_id) : self.env.pos.db.root_category_id;
							const old_cat_id = old_prod.pos_categ_id ? (Array.isArray(old_prod.pos_categ_id) ? old_prod.pos_categ_id[0] : old_prod.pos_categ_id) : null;
							if (old_cat_id && new_cat_id !== old_cat_id && stored_categories[old_cat_id]) {
								const idx = stored_categories[old_cat_id].indexOf(prod.id);
								if (idx !== -1) stored_categories[old_cat_id].splice(idx, 1);
							}
							if (stored_categories[new_cat_id] && !stored_categories[new_cat_id].includes(prod.id)) {
								stored_categories[new_cat_id].push(prod.id);
							}

							self.env.pos.db.product_by_id[new_prod.id] = new_prod;
							productsUpdated = true;
						} else {
							// Producto nuevo que no existía en la sesión
							prod.product_tmpl_id = Array.isArray(prod.product_tmpl_id) ? prod.product_tmpl_id[0] : prod.product_tmpl_id;
							prod.pos = self.env.pos;
							const new_prod = Product.create(prod);
							new_prod.applicablePricelistItems = {};
							for (let pricelist of self.env.pos.pricelists) {
								for (const pricelistItem of pricelist.items) {
									if (pricelistItem.product_id && pricelistItem.product_id[0] === new_prod.id) {
										self.env.pos._assignApplicableItems(pricelist, new_prod, pricelistItem);
									} else if (pricelistItem.product_tmpl_id && pricelistItem.product_tmpl_id[0] === new_prod.product_tmpl_id) {
										self.env.pos._assignApplicableItems(pricelist, new_prod, pricelistItem);
									}
								}
							}
							self.env.pos.db.product_by_id[new_prod.id] = new_prod;
							productsUpdated = true;
						}
					} else if (ntf.type === "res.partner/sync_data") {
						const partner = ntf.payload && ntf.payload.partner;
						if (partner) {
							partner.pos = self.env.pos;
							self.env.pos.addPartners([partner]);
						}
					}
				});

				if (productsUpdated && self.env.posbus) {
					self.env.posbus.trigger('sync-product-update');
				}
			}
		};

	Registries.Component.extend(Chrome, BiChrome);
	return Chrome;
});
