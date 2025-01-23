odoo.define('pos_all_in_one.SalesPersons', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    // Previously UsernameWidget
    class SalesPersons extends PosComponent {
        get username() {
            const { name } = this.env.pos.get_cust_salespersion();
            return name ? name : '';
        }
        get avatar() {
            const user_id = this.env.pos.get_cust_salespersion_id();
            const id = user_id ? user_id : -1;
            return `/web/image/res.users/${id}/avatar_128`;
        }

        async selectSalesPerson() {
            var self = this
            let lst = self.env.pos.pos_salesperson_record;
            var order = self.env.pos.get_order();
            const selectionList = lst.map(otype => ({
                    id: otype.id,
                    label: otype.name,
                    isSelected:false,
                    item: otype,
                }));

                const { confirmed, payload: selecteduser } = await self.showPopup('SelectionPopup',{
                    title: self.env._t('Choose SalesPersons'),
                    list: selectionList,
                });

            if (!confirmed) {
                return;
            }

            if (selecteduser) {
                this.env.pos.set_cust_salespersion(selecteduser);
                this.env.pos.set_cust_salespersion_id(selecteduser.id);
                
                if(order){
                    order.set_cust_salep_id(selecteduser.id)
                }
            }
            

            
        }
    }
    SalesPersons.template = 'SalesPersons';

    Registries.Component.add(SalesPersons);

    return SalesPersons;
});