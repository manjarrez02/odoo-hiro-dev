odoo.define('pos_customer_screen.chrome', function (require) {
    'use strict';

    const Chrome = require('point_of_sale.Chrome');
    const Registries = require('point_of_sale.Registries');
    var session = require('web.session');
    var rpc = require('web.rpc');
    
    const CChrome = (Chrome) =>
        class extends Chrome {
            setup() {
                super.setup();
                // Generar o recuperar un identificador único por navegador
                this.client_uuid = localStorage.getItem('pos_client_uuid');
                if (!this.client_uuid) {
                    this.client_uuid = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
                    localStorage.setItem('pos_client_uuid', this.client_uuid);
                }
                this.env.services.bus_service.addEventListener('notification', async ({ detail: notifications }) => {
                    const filtered = notifications.filter(n =>
                        n.type === 'relay.data' &&
                        n.payload?.client_uuid === client_uuid
                    );
                
                    if (!filtered.length) return;
                
                    const order = this.env.pos.get_order();
                    if (!order) return;
                
                    for (const notif of filtered) {
                        const payload = notif.payload;
                
                        // Evita llamar varias veces a mirror_image_data
                        order.mirror_image_data();
                
                        // Firma
                        if (payload.sign) {
                            const base30 = payload.sign['base30'];
                            const base64 = payload.sign['base64'];
                            order.set_raw_sign(base30?.[1] ? base30 : false);
                            order.set_sign(base64?.[1] ? base64 : false);
                        }
                
                        // Calificación
                        if (payload.rating_val) {
                            order.set_rating(payload.rating_val);
                        }
                
                        // Partner
                        else if (payload.partner_id) {
                            let partner = this.env.pos.db.get_partner_by_id(payload.partner_id);
                
                            if (partner) {
                                order.set_partner(partner);
                            } else {
                                const fields = _.find(this.env.pos.models, m => m.model === 'res.partner')?.fields || ['name'];
                                try {
                                    const partners = await rpc.query({
                                        model: 'res.partner',
                                        method: 'search_read',
                                        domain: [['id', '=', payload.partner_id]],
                                        fields: fields,
                                    });
                
                                    if (partners.length && this.env.pos.db.add_partners(partners)) {
                                        order.set_partner(partners[0]);
                                    } else {
                                        console.warn("Partner not loaded in POS.");
                                    }
                                } catch (err) {
                                    console.error("Error loading partner:", err);
                                }
                            }
                        } else {
                            console.info("Partner id not found!");
                        }
                    }
                });
                
            }
            async start(){
                await super.start();
                this.env.pos.get_order().mirror_image_data();
            }
    }
    Registries.Component.extend(Chrome, CChrome);

    return Chrome;
});
