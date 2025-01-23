odoo.define('x_pos_custom_view.x_DoRefund', function (require) {
    'use strict';

    // Importar dependencias necesarias
    const TicketScreen = require('point_of_sale.TicketScreen');
    const Registries = require('point_of_sale.Registries');

    // Crear una clase extendida que sobrescribe la clase TicketScreen
    const CustomTicketScreen = (TicketScreen) =>
        class extends TicketScreen {

            setup() {
				super.setup();
			}

            // Sobrescribir el método async _onDoRefund
            async _onDoRefund() {
                const order = this.getSelectedSyncedOrder();

                if (!order) {
                    this._state.ui.highlightHeaderNote = !this._state.ui.highlightHeaderNote;
                    return;
                }
                
                if (this._doesOrderHaveSoleItem(order)) {
                    if (!this._prepareAutoRefundOnOrder(order)) {
                        // Don't proceed on refund if preparation returned false.
                        return;
                    }
                }
    
                const partner = order.get_partner();
    
                const allToRefundDetails = this._getRefundableDetails(partner);
                if (allToRefundDetails.length == 0) {
                    this._state.ui.highlightHeaderNote = !this._state.ui.highlightHeaderNote;
                    return;
                }
    
                const invoicedOrderIds = new Set(
                    allToRefundDetails
                        .filter(detail => this._state.syncedOrders.cache[detail.orderline.orderBackendId].state === "invoiced")
                        .map(detail => detail.orderline.orderBackendId)
                );
    
                if (invoicedOrderIds.size > 1) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Multiple Invoiced Orders Selected'),
                        body: this.env._t('You have selected orderlines from multiple invoiced orders. To proceed refund, please select orderlines from the same invoiced order.')
                    });
                    return;
                }
    
                // The order that will contain the refund orderlines.
                // Use the destinationOrder from props if the order to refund has the same
                // partner as the destinationOrder.
                const destinationOrder =
                    this.props.destinationOrder &&
                    partner === this.props.destinationOrder.get_partner() &&
                    !this.env.pos.doNotAllowRefundAndSales()
                        ? this.props.destinationOrder
                        : this._getEmptyOrder(partner);                        
                //Add a check too see if the fiscal position exist in the pos
                if (order.fiscal_position_not_found) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Fiscal Position not found'),
                        body: this.env._t('The fiscal position used in the original order is not loaded. Make sure it is loaded by adding it in the pos configuration.')
                    });
                    return;
                }
    
                // Add orderline for each toRefundDetail to the destinationOrder.
                for (const refundDetail of allToRefundDetails) {
                    const product = this.env.pos.db.get_product_by_id(refundDetail.orderline.productId);
                    const options = this._prepareRefundOrderlineOptions(refundDetail);
                    await destinationOrder.add_product(product, options);
                    refundDetail.destinationOrderUid = destinationOrder.uid;
                }
                destinationOrder.fiscal_position = order.fiscal_position;
    
                // Set the partner to the destinationOrder.
                if (partner != destinationOrder.get_partner()) {
                    destinationOrder.set_partner(partner);
                    destinationOrder.updatePricelist(partner);
                }
                if (this.env.pos.get_order().cid !== destinationOrder.cid) {
                    this.env.pos.set_order(destinationOrder);
                }
    
                this._onCloseScreen();
            }
        };

    // Registrar la clase extendida en Registries
    Registries.Component.extend(TicketScreen, CustomTicketScreen);

    return CustomTicketScreen;
});
