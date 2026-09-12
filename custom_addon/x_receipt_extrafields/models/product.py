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
        res = super().get_product_info_pos(price, quantity, pos_config_id)
        config = self.env['pos.config'].browse(pos_config_id)

        # Pricelists
        if config.use_pricelist:
            pricelists = config.available_pricelist_ids
        else:
            pricelists = config.pricelist_id

        # Acumular reglas de precios de todas las listas activas
        pricelist_items_list = []
        for pricelist in pricelists:
            pricelist_items = self.env['product.pricelist.item'].search([
                ('product_tmpl_id', '=', self.product_tmpl_id.id),
                ('pricelist_id', '=', pricelist.id),
                ('active', '=', True)
            ])
            for item in pricelist_items:
                pricelist_items_list.append({
                    'name': pricelist.name,
                    'price_list': pricelist.name,
                    'min_quantity': item.min_quantity,
                    'fixed_price': item.fixed_price,
                    'price': item.fixed_price,
                })
        pricelist_level_dict_sorted = sorted(pricelist_items_list, key=lambda x: x['min_quantity'])

        # Ubicaciones (stock.quant) con manejo seguro de almacén nulo
        location_list = []
        stock_quants = self.env['stock.quant'].search([
            ('product_id', '=', self.id),
            ('location_id.usage', '=', 'internal')
        ])

        for quant in stock_quants:
            wh_name = quant.location_id.warehouse_id.name or quant.location_id.location_id.name or 'Sin almacén'
            location_list.append({
                'name': quant.location_id.name or '',
                'warehouse_name': wh_name,
                'available_quantity': quant.quantity,
                'reserved_quantity': quant.reserved_quantity,
                'uom': self.uom_name or ''
            })
        location_list_sorted = sorted(location_list, key=lambda l: (l['warehouse_name'] or '', l['name'] or ''))

        # Empaquetados
        packaging_list = [{
            'name': packaging.name or '',
            'qty': packaging.qty
        } for packaging in self.env['product.packaging'].search([
            ('product_id', '=', self.id)
        ])]
        packaging_list_sorted = sorted(packaging_list, key=lambda p: p['qty'], reverse=True)

        res.update({
            'pricelists': pricelist_level_dict_sorted,
            'locations': location_list_sorted,
            'packaging': packaging_list_sorted,
        })
        res.setdefault('optional_products', [])
        return res


