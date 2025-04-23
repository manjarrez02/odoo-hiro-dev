// BiProductScreen js
odoo.define('pos_orders_all.ProductsWidget', function(require) {
	"use strict";

	const ProductsWidget = require('point_of_sale.ProductsWidget');
	const PosComponent = require('point_of_sale.PosComponent');
    const { useListener } = require("@web/core/utils/hooks");
    const Registries = require('point_of_sale.Registries');
    const { onMounted } = owl;
    const {Product} = require('point_of_sale.models');
    const { onWillUnmount, useState } = owl;

	let prd_list_count = 0;
    let is_listening = false;
    let listenerCounter = 0;  // 👈 nuestro contador
    let ProductListenerAdded = false;

	const BiProductsWidget = (ProductsWidget) =>
		class extends ProductsWidget {
			setup() {
	            super.setup();
	            var self = this;
                if (!this.listener) {
                    self.listener = ({ detail: notifications }) => {
                        self.syncProdData(notifications);                                                              
                    };
                }
                self.listenerAdded = false; 

				onMounted(() => this._mounted());
                //onWillUnmount(() => this._unmounted());                
	        }

            _mounted() {
                // Evitar que se añadan múltiples listeners
                if (!ProductListenerAdded) {
                    this.env.services.bus_service.addEventListener('notification', this.listener);
                    this.listenerAdded = true;
                    ProductListenerAdded = true
                }
            }       

            _unmounted() {
                if (this.listenerAdded) {
                    this.env.services.bus_service.removeEventListener('notification', this.listener);
                    this.listenerAdded = false;
                    ProductListenerAdded = true;
                }
            }

			syncProdData(notifications) {
                let self = this;
                let batchSize = 15; // Tamaño del bloque (batch)
                let totalNotifications = notifications.length;
                let currentBatch = 0;
                let productTemplatesToLoad = []; // Acumulador para los productos que necesitan ser cargados
            
                // Función que procesa un lote de notificaciones
                function processBatch() {
                    let start = currentBatch * batchSize;
                    let end = Math.min(start + batchSize, totalNotifications);
                    let batchNotifications = notifications.slice(start, end);
            
                    // Mostrar en consola el número de batch que se está procesando
                    //console.log(`Procesando batch ${currentBatch + 1} de ${Math.ceil(totalNotifications / batchSize)}...`);
            
                    // Procesar cada notificación en el batch actual
                    batchNotifications.forEach(ntf => {
                        if (ntf && ntf.type && ntf.type == "product.product/sync_data") {
                            let prod = ntf.payload.product[0];
                            let old_category_id = self.env.pos.db.product_by_id[prod.id];
                            let new_category_id = prod.pos_categ_id[0];
                            let stored_categories = self.env.pos.db.product_by_category_id;
            
                            prod.pos = self.env.pos;
                            if (self.env.pos.db.product_by_id[prod.id]) {
                                // Actualizar el producto en la categoría antigua
                                if (old_category_id.pos_categ_id) {
                                    stored_categories[old_category_id.pos_categ_id[0]] = stored_categories[old_category_id.pos_categ_id[0]].filter(function (item) {
                                        return item != prod.id;
                                    });
                                }
                                // Añadir a la nueva categoría
                                if (stored_categories[new_category_id]) {
                                    stored_categories[new_category_id].push(prod.id);
                                }
                                self.updateProd(prod);
                            } else {
                                // Acumulamos los productos que necesitamos cargar
                                productTemplatesToLoad.push(prod);
                            }
                        } else if (ntf && ntf.type && ntf.type == "res.partner/sync_data") {
                            let partner = ntf.payload.partner;
                            partner.pos = self.env.pos;
                            //console.log("modificaré al partner");
                            if (self.env.pos.db.partner_by_id[partner.id]) {
                                self.env.pos.addPartners([partner]);
                                self.render(true);
                            } else {
                                self.env.pos.addPartners(partner);
                                self.render(true);
                            }
                        }
                    });
            
                    // Después de procesar un batch, incrementar el contador y verificar si hay más bloques
                    currentBatch++;
                    if (start + batchSize < totalNotifications) {
                        // Procesar el siguiente batch
                        setTimeout(processBatch, 0); // Recursión para continuar procesando sin bloquear la interfaz
                    } else {
                        // Cargar los productos una sola vez después de procesar todos los batches
                        if (productTemplatesToLoad.length > 0) {
                            //console.log("Cargando productos adicionales...");
                            self.env.services.rpc({
                                model: 'pos.session',
                                method: 'load_pos_data_prod_temp',
                                args: [[odoo.pos_session_id]],
                            }).then(loadedData => {
                                // Solo cargamos los productos que necesitan ser cargados
                                self.env.pos._loadProductTemplate(loadedData['product.template']);
                                productTemplatesToLoad.forEach(prod => {
                                    self.updateProd(prod);
                                });
                                //console.log("Sincronización completa.");
                                self.env.pos.is_sync = false; // Finaliza la sincronización
                            });
                        } else {
                            //console.log("Sincronización completa.");
                            self.env.pos.is_sync = false; // Finaliza la sincronización
                        }
                    }
                }
            
                self.env.pos.is_sync = true; // Indica que estamos en proceso de sincronización
                processBatch(); // Inicia el procesamiento de los bloques
            }
            

			updateProd(product){
				let self = this;
				product.product_tmpl_id = product.product_tmpl_id[0] || [];
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
				self.env.pos.db.add_products(new_prod);
				self.productsToDisplay
			}

			get is_sync() {
				return this.env.pos.is_sync;
			}


			get productsToDisplay() {
			    let self = this;
				let prods = super.productsToDisplay;
				let order = self.env.pos.get_order();
                let locations = self.env.pos.locations;
                let config_loc = self.env.pos.config.stock_location_id
                
                if (self.env.pos.config.show_stock_location == 'specific'){
                    if(self.env.pos.config.pos_stock_type == 'onhand'){
                        $.each(prods, function( i, prd ){
                            prd['qty_available'] = 0;
                            let loc_onhand = JSON.parse(prd.quant_text);



                            var quantity_available=0
                            $.each(loc_onhand, function( k, v ){
                                if(config_loc[0] == k){
                                    quantity_available = quantity_available + v[0];
                                }
                            })

                            if(prd['bi_on_hand'] > 0){
                                var bi_on_hand = order.get_display_product_qty(prd)
                                quantity_available = quantity_available - bi_on_hand
                            }
                            else{
                                var reserved_qty = order.get_display_product_qty(prd);
                                quantity_available = quantity_available -reserved_qty
                            }
                            prd['qty_available']=quantity_available

                        });
                    }else if(self.env.pos.config.pos_stock_type == 'virtual'){
                        $.each(prods, function( i, prd ){
                            let loc_available = JSON.parse(prd.quant_text);
                            prd['virtual_available'] = 0;
                            var virtual_available=0
                            let total = 0;
                            let out = 0;
                            let inc = 0;
                            $.each(loc_available, function( k, v ){
                                if(config_loc[0] == k){
                                    total += v[0];
                                    if(v[1]){
                                        out += v[1];
                                    }
                                    if(v[2]){
                                        inc += v[2];
                                    }
                                    let final_data = (total + inc) - out
                                    virtual_available = final_data;
                                }
                            })
                            if(prd['bi_on_virtual']>0){
                                var bi_on_virtual = order.get_display_product_qty(prd);
                                virtual_available = virtual_available - bi_on_virtual
                            }
                            else{
                                var reserved_qty = order.get_display_product_qty(prd);
                                virtual_available = virtual_available - reserved_qty;
                            }
                            prd['virtual_available']=virtual_available
                        });
                    }
                    else if(self.env.pos.config.pos_stock_type == 'both'){
                        $.each(prods, function( i, prd ){
                            let loc_available = JSON.parse(prd.quant_text);
                            prd['virtual_available'] = 0;
                            prd['qty_available'] = 0;
                            var virtual_available=0
                            var quantity_available=0
                            let total = 0;
                            let out = 0;
                            let inc = 0;
                            $.each(loc_available, function( k, v ){
                                if(config_loc[0] == k){
                                    total += v[0];
                                    if(v[1]){
                                        out += v[1];
                                    }
                                    if(v[2]){
                                        inc += v[2];
                                    }
                                    let final_data = (total + inc) - out
                                    virtual_available = final_data;
                                    quantity_available = quantity_available + v[0];
                                }
                            })

                            if(prd['bi_on_hand'] > 0){
                                var bi_on_hand = order.get_display_product_qty(prd)
                                quantity_available = quantity_available - bi_on_hand
                            }
                            else{
                                var reserved_qty = order.get_display_product_qty(prd);
                                quantity_available = quantity_available -reserved_qty
                            }
                            prd['qty_available']=quantity_available
                            if(prd['bi_on_virtual']>0){
                                var bi_on_virtual = order.get_display_product_qty(prd);
                                virtual_available = virtual_available - bi_on_virtual
                            }
                            else{
                                var reserved_qty = order.get_display_product_qty(prd);
                                virtual_available = virtual_available - reserved_qty;
                            }
                            prd['virtual_available']=virtual_available
                        });
                    }
                }else{
                    $.each(prods, function( i, prd ){
                        
                        let quantity_available = prd.qty_available;
                        let qty_virtual_available = prd.virtual_available;
                        var reserved_qty = order.get_display_product_qty(prd);
                        quantity_available = quantity_available -reserved_qty
                        qty_virtual_available = qty_virtual_available -reserved_qty
                        


                        prd['bi_qty_available'] = quantity_available;
                        prd['bi_virtual_available'] = qty_virtual_available;
                    });
                }
                return prods.sort(function (a, b) { return a.display_name.localeCompare(b.display_name) });
            }
            
		};

	Registries.Component.extend(ProductsWidget, BiProductsWidget);

	return ProductsWidget;

});
