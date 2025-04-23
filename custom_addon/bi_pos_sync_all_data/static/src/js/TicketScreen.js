odoo.define('bi_pos_sync_all_data.TicketScreen', function(require) {
    'use strict';

    const TicketScreen = require('point_of_sale.TicketScreen');
    const Registries = require('point_of_sale.Registries');
    const { onMounted, onWillUnmount } = owl;
    const { isConnectionError } = require('point_of_sale.utils');

    const BiTicketScreen = TicketScreen =>
        class extends TicketScreen {
            setup() {
                super.setup();
                var self = this;
                onMounted(() => this._mounted());
                onWillUnmount(() => this._unmounted());

                // Crear referencia persistente una sola vez
                if (!this._boundTicketListener) {
                    this._boundTicketListener = this._ticketNotificationListener.bind(this);
                }
                this.listenerAdded = false;
                
            }

            _ticketNotificationListener({ detail: notifications }) {
                this.syncPartnerProductData(notifications);
            }

            _mounted() {
                let check = this.env.pos.config.allow_pos_sync_data;
                if (check && !this.listenerAdded) {
                    this.env.services['bus_service'].addEventListener('notification', this._boundTicketListener);
                    this.listenerAdded = true;
                }                
            }

            _unmounted() {
                if (this.listenerAdded) {
                    this.env.services['bus_service'].removeEventListener('notification', this._boundTicketListener);
                    this.listenerAdded = false;
                }
            }

            
            async syncPartnerProductData(notifications) {
                let self = this;
                let batchSize = 10; // Tamaño del bloque (batch)
                let totalNotifications = notifications.length;
                let currentBatch = 0;
                let partnersToAdd = []; // Acumulador para los socios que necesitamos añadir
            
                // Función que procesa un lote de notificaciones
                function processBatch() {
                    let start = currentBatch * batchSize;
                    let end = Math.min(start + batchSize, totalNotifications);
                    let batchNotifications = notifications.slice(start, end);
            
                    // Mostrar en consola el número de batch que se está procesando
                    //console.log(`Procesando batch ${currentBatch + 1} de ${Math.ceil(totalNotifications / batchSize)}...`);
            
                    // Procesar cada notificación en el batch actual
                    batchNotifications.forEach(async (ntf) => {
                        ntf = JSON.parse(JSON.stringify(ntf)); // Hacer una copia profunda para evitar modificar la original
                        if (ntf && ntf.type && ntf.type == "res.partner/sync_data") {
                            let partner = ntf.payload.partner;
                            partner.pos = self.env.pos;
            
                            if (self.env.pos.db.partner_by_id[partner.id]) {
                                // Si el socio ya existe, lo añadimos a la lista
                                self.env.pos.addPartners([partner]);
                                partnersToAdd.push(partner);
                            } else {
                                // Si no existe, lo añadimos directamente
                                self.env.pos.addPartners(partner);
                                partnersToAdd.push(partner);
                            }
                        }
                    });
            
                    // Después de procesar un batch, incrementar el contador y verificar si hay más bloques
                    currentBatch++;
                    if (start + batchSize < totalNotifications) {
                        // Procesar el siguiente batch
                        setTimeout(processBatch, 0); // Recursión para continuar procesando sin bloquear la interfaz
                    } else {
                        // Llamar a render después de procesar todos los lotes
                        if (partnersToAdd.length > 0) {
                            //console.log("Sincronización de socios y productos completa.");
                            self.render(true); // Realizamos render después de procesar todos los lotes
                        }
                    }
                }
            
                self.env.pos.is_sync = true; // Indica que estamos en proceso de sincronización
                processBatch(); // Inicia el procesamiento de los bloques
            }
            

            updatePartner(partner){
                let self = this;
                self.env.pos.db.add_partners(partner); 
            }

        };

    Registries.Component.extend(TicketScreen, BiTicketScreen);

    return TicketScreen;
});
