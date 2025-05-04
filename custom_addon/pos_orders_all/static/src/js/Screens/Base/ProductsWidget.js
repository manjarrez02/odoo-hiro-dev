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
                let batchSize = 15;                
                let productTemplatesToLoad = [];
            
                // Filtrar notificaciones relevantes antes de procesar
                let filtered = notifications.filter(ntf =>
                    ntf && ntf.type && (
                        ntf.type === "product.product/sync_data" ||
                        ntf.type === "res.partner/sync_data"
                    )
                );
                let totalNotifications = filtered.length;
                let currentBatch = 0;
            
                function processBatch() {
                    let start = currentBatch * batchSize;
                    let end = Math.min(start + batchSize, totalNotifications);
                    let batchNotifications = filtered.slice(start, end);
                    let needsRender = false;
            
                    batchNotifications.forEach(ntf => {
                        if (ntf.type === "product.product/sync_data") {
                            let prod = ntf.payload.product[0];
                            let old_product = self.env.pos.db.product_by_id[prod.id];
                            let new_category_id = prod.pos_categ_id[0];
                            let stored_categories = self.env.pos.db.product_by_category_id;
            
                            prod.pos = self.env.pos;
            
                            if (old_product) {
                                // Remover de la categoría antigua de forma rápida
                                let old_cat_id = old_product.pos_categ_id?.[0];
                                if (old_cat_id && stored_categories[old_cat_id]) {
                                    let idx = stored_categories[old_cat_id].indexOf(prod.id);
                                    if (idx !== -1) stored_categories[old_cat_id].splice(idx, 1);
                                }
            
                                // Agregar a la nueva categoría
                                if (stored_categories[new_category_id]) {
                                    stored_categories[new_category_id].push(prod.id);
                                }
            
                                self.updateProd(prod);
                            } else {
                                productTemplatesToLoad.push(prod);
                            }
            
                        } else if (ntf.type === "res.partner/sync_data") {
                            let partner = ntf.payload.partner;
                            partner.pos = self.env.pos;
            
                            if (self.env.pos.db.partner_by_id[partner.id]) {
                                self.env.pos.addPartners([partner]);
                            } else {
                                self.env.pos.addPartners(partner);
                            }
            
                            needsRender = true; // Marcar para render al final del batch
                        }
                    });
            
                    if (needsRender) self.render(true);
            
                    currentBatch++;
                    if (start + batchSize < totalNotifications) {
                        setTimeout(processBatch, 0); // Pausar para no bloquear
                    } else {
                        // Fin del procesamiento: cargar productos que faltan
                        if (productTemplatesToLoad.length > 0) {
                            self.env.services.rpc({
                                model: 'pos.session',
                                method: 'load_pos_data_prod_temp',
                                args: [[odoo.pos_session_id]],
                            }).then(loadedData => {
                                self.env.pos._loadProductTemplate(loadedData['product.template']);
                                productTemplatesToLoad.forEach(prod => {
                                    self.updateProd(prod);
                                });
                                self.env.pos.is_sync = false;
                            });
                        } else {
                            self.env.pos.is_sync = false;
                        }
                    }
                }
            
                self.env.pos.is_sync = true;
                processBatch();
            }
            
            

            updateProd(product) {
                let self = this;
                product.product_tmpl_id = product.product_tmpl_id[0] || [];
                product.pos = self.env.pos;
                
                // Crear nuevo producto
                let new_prod = Product.create(product);
                
                // Reasignar precios de listas correctamente
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
            
                // Actualizar base de datos POS
                self.env.pos.db.product_by_id[new_prod.id] = new_prod;
                self.env.pos.db.add_products(new_prod);
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
