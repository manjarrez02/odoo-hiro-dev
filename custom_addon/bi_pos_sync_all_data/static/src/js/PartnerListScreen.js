odoo.define('bi_pos_sync_all_data.PartnerListScreen', function(require) {
    'use strict';

    const PartnerListScreen = require('point_of_sale.PartnerListScreen');
    const Registries = require('point_of_sale.Registries');
    const { onMounted, onWillUnmount } = owl;
    const { isConnectionError } = require('point_of_sale.utils');

    const BiPartnerListScreen = PartnerListScreen =>
        class extends PartnerListScreen {
            setup() {
                super.setup();
                var self = this;
                onMounted(() => this._mounted());
                onWillUnmount(() => this._unmounted());
                let check = self.env.pos.config.allow_pos_sync_data;
                if(check){
                    self.searchPartner()
                }
                if (!this._boundPartnerListener) {
                    this._boundPartnerListener = this._partnerNotificationListener.bind(this);
                }            
                this.listenerAdded = false;
            }

            _partnerNotificationListener({ detail: notifications }) {
                this.syncPartnerData(notifications);
            }

            _mounted() {
                let check = this.env.pos.config.allow_pos_sync_data;
                if (check && !this.listenerAdded) {
                    this.env.services['bus_service'].addEventListener('notification', this._boundPartnerListener);
                    this.listenerAdded = true;                    
                }
            }
            
            _unmounted() {
                if (this.listenerAdded) {
                    this.env.services['bus_service'].removeEventListener('notification', this._boundPartnerListener);
                    this.listenerAdded = false;
                }
            }


            async syncPartnerData(notifications){
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
                this.partners
                this.searchPartner()
            }

            updatePartner(partner){
                let self = this;
                self.env.pos.db.add_partners(partner); 
            }

        };

    Registries.Component.extend(PartnerListScreen, BiPartnerListScreen);

    return PartnerListScreen;
});
