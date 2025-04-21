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

            
            async syncPartnerProductData(notifications){
                let self = this;
                notifications.forEach(async function (ntf) {
                    ntf = JSON.parse(JSON.stringify(ntf))
                    if(ntf && ntf.type && ntf.type == "res.partner/sync_data"){
                        let partner = ntf.payload.partner;
                        partner.pos = self.env.pos;

                        if(self.env.pos.db.partner_by_id[partner.id]){
                            self.env.pos.addPartners([partner]);
                            self.render(true);
                        }else{
                            self.env.pos.addPartners(partner);
                            self.render(true);
                        }
                       
                    }
                });       
            }

            updatePartner(partner){
                let self = this;
                self.env.pos.db.add_partners(partner); 
            }

        };

    Registries.Component.extend(TicketScreen, BiTicketScreen);

    return TicketScreen;
});
