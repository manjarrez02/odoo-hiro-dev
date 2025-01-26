# -*- coding: utf-8 -*-
# Copyright (C) Softhealer Technologies.

from odoo import models, api, _
from odoo.http import request
from datetime import datetime

class Product(models.Model):
    _inherit = 'product.product'

    @api.model
    def all_scan_search(self, barcode):
        product_id = self
        if barcode:
            if self.env.company.sh_search_char_field_product.sudo():
                state = True
                for char_fields in self.env.company.sh_search_char_field_product.sudo():
                    field_name = char_fields.name
                    field_value = barcode
                    if state:
                        product_prd = self.env['product.product'].sudo().search([(field_name, '=', field_value)], limit=1)
                        product_id = product_prd
                        if ('product.barcode' in self.env) and not product_id and field_name == "barcode":
                            product_bcd = self.env['product.barcode'].sudo().search([(field_name, '=', field_value)], limit=1)
                            if product_bcd:
                                product_id = self.env['product.product'].sudo().search([('product_tmpl_id.id', '=', product_bcd.product_tmpl_id.id)], limit=1)
                        #product_id = self.search(
                        #    [(field_name, '=', field_value)], limit=1)
                        if product_id:
                            state = False
                        else:
                            state = True
                if product_id:
                    pricelists = self.env['product.pricelist'].sudo().search([('id', '=', 1)])   

                    now = datetime.now()                 
                    # Filtramos los ítems con la lógica para la comparación de fechas
                    matched_items = pricelists.item_ids.filtered(
                        lambda item: 
                            item.product_tmpl_id.id == product_id.product_tmpl_id.id and (
                                # Fecha inicio y fin definidas
                                (item.date_start and item.date_end and item.date_start <= now and item.date_end >= now) or
                                # Solo 'date_start' definida
                                (item.date_start and not item.date_end and item.date_start <= now) or
                                # Solo 'date_end' definida
                                (not item.date_start and item.date_end and item.date_end >= now) or
                                # Ninguna fecha definida
                                (not item.date_start and not item.date_end)
                            )
                    )
   
                    sorted_items = matched_items.sorted(key=lambda item: item.min_quantity)
                    price_list_values = []  # Inicializa un array vacío
                    min_qty_list_values = []  # Inicializa un array vacío
                    if sorted_items:
                        # Itera sobre todos los elementos en sorted_items
                        for item in sorted_items:
                            price_list_values.append(item.fixed_price)  # Añade el precio al array
                            min_qty_list_values.append(item.min_quantity)
                    '''
                    if pricelists:
                        list = True
                        price_list_value = 0.0
                        for pricelist in pricelists:
                            if list:
                                for item in pricelist.item_ids:
                                    if product_id.name == item.product_tmpl_id.name:
                                        price_list_value = item.fixed_price
                                        list = False
                    '''
                    attribute_list = []
                    if product_id.product_template_attribute_value_ids:
                        for attribute in product_id.product_template_attribute_value_ids:
                            attribute_list.append(
                                str(attribute.product_attribute_value_id.name))
                    attribute_str = ''
                    attribute_str = ','.join(attribute_list)
                    msg_dict = {
                        'issuccess': 1, 'msg': _('Successfully Found Product corresponding to %(barcode)s') % {'barcode': barcode},
                    }
                    if price_list_values:
                        msg_dict.update({
                            'sh_product_pricelist': price_list_values,
                            'sh_product_pricelist_min_qty': min_qty_list_values,
                        })
                    if product_id.name:
                        msg_dict.update({
                            'sh_product_name': product_id.name,
                        })
                    if product_id.default_code:
                        msg_dict.update({
                            'sh_product_code': product_id.default_code,
                        })
                    if product_id.barcode:
                        msg_dict.update({
                            'sh_product_barcode': product_id.barcode,
                        })
                    if product_id.image_1920:
                        msg_dict.update({
                            'sh_product_image': product_id.image_1920,
                        })
                    if product_id.categ_id:
                        msg_dict.update({
                            'sh_product_category': product_id.categ_id.name,
                        })
                    if product_id.weight:
                        msg_dict.update({
                            'sh_product_weight': str(product_id.weight)+"  " + product_id.weight_uom_name,
                        })
                    if attribute_str != '':
                        msg_dict.update({
                            'sh_product_attribute': attribute_str,
                        })
                    else:
                        msg_dict.update({
                            'sh_product_attribute': '',
                        })
                    model_id = self.env['ir.model'].sudo().search(
                        [('model', '=', 'product.product')], limit=1)
                    currency_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'currency_id'), ('model_id', '=', model_id.id)], limit=1)
                    list_price_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'list_price'), ('model_id', '=', model_id.id)], limit=1)
                    qty_available_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'qty_available'), ('model_id', '=', model_id.id)], limit=1)
                    uom_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'uom_id'), ('model_id', '=', model_id.id)], limit=1)
                    description_sale_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'description_sale'), ('model_id', '=', model_id.id)], limit=1)
                    if model_id:
                        if currency_field_id and list_price_field_id:
                            msg_dict.update({
                                'sh_product_sale_price': product_id.list_price,
                            })
                        elif currency_field_id and not list_price_field_id:
                            msg_dict.update({
                                'sh_product_sale_price': 0,
                            })
                        else:
                            msg_dict.update({
                                'sh_product_sale_price': 0,
                            })
                        print(f"\n\n==>> qty_available_field_id: {qty_available_field_id}")
                        print(f"\n\n==>> uom_field_id: {uom_field_id}")
                        if qty_available_field_id and uom_field_id:
                            msg_dict.update({
                                'sh_product_stock': str(product_id.qty_available) + ' '+str(product_id.uom_id.name),
                            })
                        elif not qty_available_field_id and uom_field_id:
                            msg_dict.update({
                                'sh_product_stock': str('0.0') + ' '+str(product_id.uom_id.name),
                            })
                        if qty_available_field_id and uom_field_id:
                            warehouse_list = []
                            cids = request and request.httprequest.cookies.get(
                                'cids')
                            if cids:
                                cids = [int(cid) for cid in cids.split(',')]
                            if cids and len(cids) > 1:
                                domain = [('company_id', 'in', cids)]
                            else:
                                domain = [
                                    ('company_id', '=', self.env.company.id)]

                            find_warehouse = self.env['stock.warehouse'].sudo().search(
                                domain)

                            for warehouse in find_warehouse:
                                warehouse_list.append({
                                    '%s' % (warehouse.name): str(product_id.with_context(warehouse=warehouse.id).virtual_available) + ' '+str(product_id.uom_id.name),
                                })
                            msg_dict.update({
                                'sh_product_stock': warehouse_list,
                                'is_warehouse':True,
                            })
                        elif not qty_available_field_id and uom_field_id:
                            msg_dict.update({
                                'sh_product_stock': str('0.0') + ' '+str(product_id.uom_id.name),
                            })
                        if description_sale_field_id:
                            if product_id.description_sale:
                                msg_dict.update({
                                    'sh_product_sale_description': product_id.description_sale,
                                })
                            else:
                                msg_dict.update({
                                    'sh_product_sale_description': '',
                                })
                        else:
                            msg_dict.update({
                                'sh_product_sale_description': '',
                            })
                    return msg_dict
                else:
                    return {'msg': _('Not Found Corresponding to %(barcode)s') % {'barcode': barcode}}
            else:
                product_id = self.search([('barcode', '=', barcode)], limit=1)
                if product_id:
                    attribute_list = []
                    if product_id.product_template_attribute_value_ids:
                        for attribute in product_id.product_template_attribute_value_ids:
                            attribute_list.append(
                                str(attribute.product_attribute_value_id.name))
                    attribute_str = ''
                    attribute_str = ','.join(attribute_list)
                    msg_dict = {
                        'issuccess': 1, 'msg': _('Successfully Found Product corresponding to %(barcode)s') % {'barcode': barcode},
                    }
                    if product_id.name:
                        msg_dict.update({
                            'sh_product_name': product_id.name,
                        })
                    if product_id.default_code:
                        msg_dict.update({
                            'sh_product_code': product_id.default_code,
                        })
                    if product_id.barcode:
                        msg_dict.update({
                            'sh_product_barcode': product_id.barcode,
                        })
                    if product_id.image_1920:
                        msg_dict.update({
                            'sh_product_image': product_id.image_1920,
                        })
                    if product_id.categ_id:
                        msg_dict.update({
                            'sh_product_category': product_id.categ_id.name,
                        })
                    if product_id.weight:
                        msg_dict.update({
                            'sh_product_weight': product_id.weight,
                        })
                    if attribute_str != '':
                        msg_dict.update({
                            'sh_product_attribute': attribute_str,
                        })
                    else:
                        msg_dict.update({
                            'sh_product_attribute': '',
                        })
                    model_id = self.env['ir.model'].sudo().search(
                        [('model', '=', 'product.product')], limit=1)
                    currency_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'currency_id'), ('model_id', '=', model_id.id)], limit=1)
                    list_price_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'list_price'), ('model_id', '=', model_id.id)], limit=1)
                    qty_available_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'qty_available'), ('model_id', '=', model_id.id)], limit=1)
                    uom_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'uom_id'), ('model_id', '=', model_id.id)], limit=1)
                    description_sale_field_id = self.env['ir.model.fields'].sudo().search(
                        [('name', '=', 'description_sale'), ('model_id', '=', model_id.id)], limit=1)
                    if model_id:
                        if currency_field_id and list_price_field_id:
                            msg_dict.update({
                                'sh_product_sale_price': product_id.list_price,
                            })
                        elif currency_field_id and not list_price_field_id:
                            msg_dict.update({
                                'sh_product_sale_price': 0,
                            })
                        else:
                            msg_dict.update({
                                'sh_product_sale_price': 0,
                            })
                        print(f"\n\n==>> qty_available_field_id: {qty_available_field_id}")
                        print(f"\n\n==>> uom_field_id: {uom_field_id}")
                        if qty_available_field_id and uom_field_id:
                            msg_dict.update({
                                'sh_product_stock': str(product_id.qty_available) + ' '+str(product_id.uom_id.name),
                            })
                        elif not qty_available_field_id and uom_field_id:
                            msg_dict.update({
                                'sh_product_stock': str('0.0') + ' '+str(product_id.uom_id.name),
                            })
                        if qty_available_field_id and uom_field_id:
                            warehouse_list = []
                            cids = request and request.httprequest.cookies.get(
                                'cids')
                            if cids:
                                cids = [int(cid) for cid in cids.split(',')]
                            if cids and len(cids) > 1:
                                domain = [('company_id', 'in', cids)]
                            else:
                                domain = [
                                    ('company_id', '=', self.env.company.id)]

                            find_warehouse = self.env['stock.warehouse'].sudo().search(
                                domain)

                            for warehouse in find_warehouse:
                                warehouse_list.append({
                                    '%s' % (warehouse.name): str(product_id.with_context(warehouse=warehouse.id).virtual_available) + ' '+str(product_id.uom_id.name),
                                })
                            msg_dict.update({
                                'sh_product_stock': warehouse_list,
                                'is_warehouse':True,
                            })
                        if description_sale_field_id:
                            if product_id.description_sale:
                                msg_dict.update({
                                    'sh_product_sale_description': product_id.description_sale,
                                })
                            else:
                                msg_dict.update({
                                    'sh_product_sale_description': '',
                                })
                        else:
                            msg_dict.update({
                                'sh_product_sale_description': '',
                            })
                    return msg_dict
                else:
                    return {'msg': _('Not Found Corresponding to %(barcode)s') % {'barcode': barcode}}
