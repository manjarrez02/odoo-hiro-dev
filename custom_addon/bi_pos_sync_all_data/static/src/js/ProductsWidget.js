odoo.define('bi_pos_sync_all_data.ProductsWidget', function(require) {
	"use strict";

	const Registries = require('point_of_sale.Registries');
	const ProductsWidget = require('point_of_sale.ProductsWidget');
	const {Product} = require('point_of_sale.models');
	const { onMounted } = owl;

	const BiProductsWidget = (ProductsWidget) =>
		class extends ProductsWidget {
			setup() {
				super.setup();
				var self = this;
				onMounted(() => this._mounted());
			}

			_mounted() {
				let self = this;
				let check = self.env.pos.config.allow_pos_sync_data;
				if(check){
					this.env.services.bus_service.addEventListener('notification', ({ detail: notifications }) => {
						self.syncProdData(notifications);
					});
				}
				
			}

			syncProdData(notifications){
				let self = this;
				console.log("Estos procesando la notificación", notifications);
				notifications.forEach(function (ntf) {
					ntf = JSON.parse(JSON.stringify(ntf))					
					if(ntf && ntf.type && ntf.type == "product.product/sync_data"){
						let prod = ntf.payload.product[0];
						let old_category_id = self.env.pos.db.product_by_id[prod.id];
						let new_category_id = prod.pos_categ_id[0];
						let stored_categories = self.env.pos.db.product_by_category_id;

						prod.pos = self.env.pos;
						if(self.env.pos.db.product_by_id[prod.id]){
							if(old_category_id.pos_categ_id){
								stored_categories[old_category_id.pos_categ_id[0]] = stored_categories[old_category_id.pos_categ_id[0]].filter(function(item) {
									return item != prod.id;
								});
							}
							if(stored_categories[new_category_id]){
								stored_categories[new_category_id].push(prod.id);
							}
							let updated_prod = self.updateProd(prod);
						}else{
							let updated_prod = self.updateProd(prod);
						}
					}
				});
			}

			updateProd(product){
				let self = this;
				self.env.pos._loadProductProduct([product]);
				const productMap = {};
				const productTemplateMap = {};

				product.pos = self.env.pos; 
				product.applicablePricelistItems = {};
				productMap[product.id] = product;
				productTemplateMap[product.product_tmpl_id[0]] = (productTemplateMap[product.product_tmpl_id[0]] || []).concat(product);
				let new_prod =  Product.create(product);
				for (let pricelist of self.env.pos.pricelists) {
					for (const pricelistItem of pricelist.items) {
						if (pricelistItem.product_id) {
							let product_id = pricelistItem.product_id[0];
							let correspondingProduct = productMap[product_id];
							if (correspondingProduct) {
								self.env.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
							}
						}
						else if (pricelistItem.product_tmpl_id) {
							let product_tmpl_id = pricelistItem.product_tmpl_id[0];
							let correspondingProducts = productTemplateMap[product_tmpl_id];
							for (let correspondingProduct of (correspondingProducts || [])) {
								self.env.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
							}
						}
						else {
							for (const correspondingProduct of product) {
								self.env.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
							}
						}
					}
				}
				self.env.pos.db.product_by_id[product.id] = new_prod ;
			}
			
		};

	Registries.Component.extend(ProductsWidget, BiProductsWidget);

	return ProductsWidget;

});
