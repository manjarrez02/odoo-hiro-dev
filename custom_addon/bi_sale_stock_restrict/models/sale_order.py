# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from datetime import datetime, timedelta

from odoo import api, fields, models, _
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT, float_compare, float_round
from odoo.exceptions import UserError


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    qty_available = fields.Float('On Hand Quantity',related="product_id.qty_available",store=True)
    virtual_available = fields.Float('Forecasted Quantity',related="product_id.virtual_available",store=True)
    type = fields.Selection(string='Type',related="product_id.type",store=True)
    
    @api.model_create_multi
    def create(self, vals):
        result = super(SaleOrderLine, self).create(vals)
        for val in result:
             val.write({'qty_available':val.product_id.qty_available,'virtual_available':val.product_id.virtual_available,})
        return result

    @api.onchange('product_id')
    def _onchange_product_id_uom_check_availability(self):
        self._onchange_product_id_check_availability()

    @api.onchange('product_uom_qty', 'product_uom', 'route_id')
    def _onchange_product_id_check_availability(self):
        if self.product_id.type == 'product':
            qty_avail = self.product_id.virtual_available
            qty_on = self.product_id.qty_available
            
            precision = self.env['decimal.precision'].precision_get('Product Unit of Measure')
            product = self.product_id.with_context(
                warehouse=self.order_id.warehouse_id.id,
                lang=self.order_id.partner_id.lang or self.env.user.lang or 'en_US'
            )
            product_qty = self.product_uom._compute_quantity(self.product_uom_qty, self.product_id.uom_id)
            if float_compare(product.virtual_available, product_qty, precision_digits=precision) == -1:
                is_available = self._check_routing()
                if not is_available:
                    message =  _('You plan to sell %s %s of %s but you only have %s %s available in %s warehouse.') % \
                            (self.product_uom_qty, self.product_uom.name, self.product_id.name, product.virtual_available, product.uom_id.name, self.order_id.warehouse_id.name)
                    # We check if some products are available in other warehouses.
                    if float_compare(product.virtual_available, self.product_id.virtual_available, precision_digits=precision) == -1:
                        message += _('\nThere are %s %s available across all warehouses.\n\n') % \
                                (self.product_id.virtual_available, product.uom_id.name)
                        for warehouse in self.env['stock.warehouse'].search([]):
                            quantity = self.product_id.with_context(warehouse=warehouse.id).virtual_available
                            if quantity > 0:
                                message += "%s: %s %s\n" % (warehouse.name, quantity, self.product_id.uom_id.name)
                    warning_mess = {
                        'title': _('Not enough inventory!'),
                        'message' : message
                    }
                    if self.env.user.company_id.low_stock:
                        return {'warning': warning_mess}
        return {}

    def _check_routing(self):
        """ Verify the route of the product based on the warehouse
            return True if the product availibility in stock does not need to be verified,
            which is the case in MTO, Cross-Dock or Drop-Shipping
        """
        is_available = False
        product_routes = self.route_id or (self.product_id.route_ids + self.product_id.categ_id.total_route_ids)

        # Check MTO
        wh_mto_route = self.order_id.warehouse_id.mto_pull_id.route_id
        if wh_mto_route and wh_mto_route <= product_routes:
            is_available = True
        else:
            mto_route = False
            try:
                mto_route = self.env['stock.warehouse']._find_global_route('stock.route_warehouse0_mto', _('Make To Order'))
            except UserError:
                # if route MTO not found in ir_model_data, we treat the product as in MTS
                pass
            if mto_route and mto_route in product_routes:
                is_available = True

        # Check Drop-Shipping
        if not is_available:
            for pull_rule in product_routes.mapped('rule_ids'):
                if pull_rule.picking_type_id.sudo().default_location_src_id.usage == 'supplier' and\
                        pull_rule.picking_type_id.sudo().default_location_dest_id.usage == 'customer':
                    is_available = True
                    break

        return is_available

class SaleOrder(models.Model):
    _inherit = "sale.order"

    def action_confirm(self):
        message = ''
        if self.env.user.company_id.stock_restriction:
            if self.env.user.company_id.stock_check_type == 'on_hand':
                onhand_count = 0
                for line in self.order_line:
                    if line.product_id.type == 'product':
                        precision = self.env['decimal.precision'].precision_get('Product Unit of Measure')
                        product = line.product_id.with_context(
                            warehouse=line.order_id.warehouse_id.id,
                            lang=line.order_id.partner_id.lang or self.env.user.lang or 'en_US'
                        )
                        product_qty = line.product_uom._compute_quantity(line.product_uom_qty, line.product_id.uom_id)
                        if float_compare(product.qty_available, product_qty, precision_digits=precision) == -1:
                            is_available = line._check_routing()
                            if not is_available:
                                onhand_count +=1
                                if onhand_count == 1:
                                    message += (
                                    _('You can not confirm %s order due to following reasons:\n\n')
                                    % (self.name))
                                message +=  _(
                            _('You have added %s %s of %s but you only have %s %s available in %s warehouse.\n')
                            % (line.product_uom_qty,line.product_id.uom_id.name,line.product_id.display_name,line.qty_available,
                                line.product_id.uom_id.name,self.env.user.company_id.name))
                                # We check if some products are available in other warehouses.
                                if float_compare(product.qty_available, line.product_id.qty_available, precision_digits=precision) == -1:
                                    message += _('\nThere are %s %s available across all warehouses.\n\n') % \
                                            (line.product_id.qty_available, product.uom_id.name)
                                    for warehouse in self.env['stock.warehouse'].search([]):
                                        quantity = line.product_id.with_context(warehouse=warehouse.id).qty_available
                                        if quantity > 0:
                                            message += "%s: %s %s\n" % (warehouse.name, quantity, line.product_id.uom_id.name)
            else:
                forecast_count = 0
                for line in self.order_line:
                    if line.product_id.type == 'product':
                        precision = self.env['decimal.precision'].precision_get('Product Unit of Measure')
                        product = line.product_id.with_context(
                            warehouse=line.order_id.warehouse_id.id,
                            lang=line.order_id.partner_id.lang or self.env.user.lang or 'en_US'
                        )
                        product_qty = line.product_uom._compute_quantity(line.product_uom_qty, line.product_id.uom_id)
                        if float_compare(product.virtual_available, product_qty, precision_digits=precision) == -1:
                            is_available = line._check_routing()
                            if not is_available:
                                forecast_count +=1
                                if forecast_count == 1:
                                    message += (
                                    _('You can not confirm %s order due to following reasons:\n\n')
                                    % (self.name))
                                message +=  _(
                            _('You have added %s %s of %s but you only have %s %s available in %s warehouse.\n')
                            % (line.product_uom_qty,line.product_id.uom_id.name,line.product_id.display_name,line.virtual_available,
                                line.product_id.uom_id.name,self.env.user.company_id.name))
                                # We check if some products are available in other warehouses.
                                if float_compare(product.virtual_available, line.product_id.virtual_available, precision_digits=precision) == -1:
                                    message += _('\nThere are %s %s available across all warehouses.\n\n') % \
                                            (line.product_id.virtual_available, product.uom_id.name)
                                    for warehouse in self.env['stock.warehouse'].search([]):
                                        quantity = line.product_id.with_context(warehouse=warehouse.id).virtual_available
                                        if quantity > 0:
                                            message += "%s: %s %s\n" % (warehouse.name, quantity, line.product_id.uom_id.name)
            if message != '':
                raise UserError(message)
        result = super(SaleOrder, self).action_confirm()
        return result
    