# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, fields, models, _
from odoo.exceptions import UserError
from itertools import groupby
from operator import itemgetter
from datetime import date


class ProductProduct(models.Model):
    _inherit = 'product.product'

    def get_product_info_pos(self, price, quantity, pos_config_id):
        self.ensure_one()
        config = self.env['pos.config'].browse(pos_config_id)

        # Tax related
        taxes = self.taxes_id.compute_all(price, config.currency_id, quantity, self)
        grouped_taxes = {}
        for tax in taxes['taxes']:
            if tax['id'] in grouped_taxes:
                grouped_taxes[tax['id']]['amount'] += tax['amount']/quantity if quantity else 0
            else:
                grouped_taxes[tax['id']] = {
                    'name': tax['name'],
                    'amount': tax['amount']/quantity if quantity else 0
                }

        all_prices = {
            'price_without_tax': taxes['total_excluded']/quantity if quantity else 0,
            'price_with_tax': taxes['total_included']/quantity if quantity else 0,
            'tax_details': list(grouped_taxes.values()),
        }

        # Pricelists
        if config.use_pricelist:
            pricelists = config.available_pricelist_ids
        else:
            pricelists = config.pricelist_id

        # Crear un diccionario para almacenar los niveles de precios de las listas de precios
        pricelist_level_dict = {}

        # Iterar sobre cada lista de precios
        for pricelist in pricelists:
            # Buscar las reglas de precio activas para el producto
            prod_tmpl_id = self.product_tmpl_id
            pricelist_items = self.env['product.pricelist.item'].search([                                             
                ('product_tmpl_id', '=', self.product_tmpl_id.id),
                ('pricelist_id', '=', pricelist.id),
                ('active', '=', True)
            ])
            
            # Inicializamos un diccionario para cada lista de precios
            pricelist_level_dict = []

            # Agregar la cantidad mínima y el precio fijo al diccionario
            for item in pricelist_items:
                pricelist_level_dict.append({  # Usar append para agregar un nuevo diccionario a la lista
                    'price_list': pricelist.name,
                    'min_quantity': item.min_quantity,
                    'fixed_price': item.fixed_price,
                })
            pricelist_level_dict_sorted = sorted(pricelist_level_dict, key=lambda x: x['min_quantity'])
        # Warehouses
        warehouse_list = [
            {'name': w.name,
            'available_quantity': self.with_context({'warehouse': w.id}).qty_available,
            'forecasted_quantity': self.with_context({'warehouse': w.id}).virtual_available,
            'uom': self.uom_name}
            for w in self.env['stock.warehouse'].search([])]

        # Suppliers
        key = itemgetter('partner_id')
        supplier_list = []
        for key, group in groupby(sorted(self.seller_ids, key=key), key=key):
            for s in list(group):
                if not((s.date_start and s.date_start > date.today()) or (s.date_end and s.date_end < date.today()) or (s.min_qty > quantity)):
                    supplier_list.append({
                        'name': s.partner_id.name,
                        'delay': s.delay,
                        'price': s.price
                    })
                    break

        # Variants
        variant_list = [{'name': attribute_line.attribute_id.name,
                         'values': list(map(lambda attr_name: {'name': attr_name, 'search': '%s %s' % (self.name, attr_name)}, attribute_line.value_ids.mapped('name')))}
                        for attribute_line in self.attribute_line_ids]

        # Agregar la información de ubicaciones (stock.quant)
        location_list = []
        stock_quants = self.env['stock.quant'].search([('product_id', '=', self.id), ('location_id.usage', '=', 'internal')])

        for quant in stock_quants:
            location_list.append({
                'name': quant.location_id.name,
                'warehouse_name': quant.location_id.warehouse_id.name,
                'available_quantity': quant.quantity,  # Cantidad disponible en esta ubicación
                'reserved_quantity': quant.reserved_quantity,  # Cantidad reservada en esta ubicación
                'uom': self.uom_name
            })                        
        location_list_sorted = sorted(location_list, key=lambda l: l['warehouse_name'])

        

        return {
            'all_prices': all_prices,
            'pricelists': pricelist_level_dict_sorted,
            'warehouses': warehouse_list,
            'locations' : location_list_sorted,
            'suppliers': supplier_list,
            'variants': variant_list
        }


