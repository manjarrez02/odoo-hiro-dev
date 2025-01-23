
from odoo.exceptions import UserError, ValidationError
import logging
import re
from odoo import api, fields, models, tools, _
from odoo.osv import expression
from odoo.http import request
from collections import defaultdict


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    product_barcode = fields.One2many('product.barcode', 'product_tmpl_id',string='Product Multi Barcodes')
    company_barcode_id = fields.Many2one('res.company', 'Company ', default=lambda self: self.env.user.company_id)
    multi_barcode_for_product = fields.Boolean(related='company_barcode_id.multi_barcode_for_product', string="Multi Barcode For Product")

class ProductInherit(models.Model):
    _inherit = 'product.product'

    @api.model
    def _name_search(self, name, args=None, operator='ilike', limit=100, name_get_uid=None):
        active_model = self._context.get('active_model') or self._inherit
        company_id = self.env.user.company_id
        if company_id.multi_barcode_for_product == True:
            if not args:
                args = []
            if name:
                positive_operators = ['=', 'ilike', '=ilike', 'like', '=like']
                product_ids = []
                model_name = []
                if operator in positive_operators:
                    product_ids = list(self._search([('default_code', '=', name)] + args, limit=limit, access_rights_uid=name_get_uid))

                    if not product_ids:
                        product_ids = list(self._search([('barcode', '=', name)] + args, limit=limit, access_rights_uid=name_get_uid))
                        sale_order_line_model = "sale.order.line"
                        purchase_order_line_model = "purchase.order.line"
                        account_move_line_model = "account.move.line"
                        stock_scrap_model ="stock.scrap"
                        stock_move_model = "stock.move"
                        stock_quant_model ="stock.quant"
                        stock_warhouse ="stock.warehouse.orderpoint"

                        model_name = self._context.get('create_date_model')
                        if self._context.get('create_date_model') == sale_order_line_model:
                            model_name = "Sales Order"

                        elif self._context.get('create_date_model') == purchase_order_line_model:
                            model_name = "Purchase Order"

                        elif self._context.get('create_date_model') == account_move_line_model:
                            model_name = "Account"

                        elif self._context.get('create_date_model') == stock_scrap_model:
                            model_name = "Scrap"

                        elif self._context.get('create_date_model') == stock_move_model:
                            model_name = "Transfer"

                        elif self._context.get('create_date_model') == stock_quant_model:
                            model_name = "Quants"

                        elif self._context.get('create_date_model') == stock_warhouse:
                            model_name = "Minimum Inventory Rule"

                        product_barcode_ids = self.env['product.barcode']._search([
                        ('barcode', operator, name), ('model_ids.name', "=", model_name)], access_rights_uid=name_get_uid)

                        if product_barcode_ids:
                            product_ids = list(self._search(['|',('barcode', '=', name),('product_barcode.barcode', '=', name)] + args, limit=limit, access_rights_uid=name_get_uid))

                if not product_ids and operator not in expression.NEGATIVE_TERM_OPERATORS:
                    # Do not merge the 2 next lines into one single search, SQL search performance would be abysmal
                    # on a database with thousands of matching products, due to the huge merge+unique needed for the
                    # OR operator (and given the fact that the 'name' lookup results come from the ir.translation table
                    # Performing a quick memory merge of ids in Python will give much better performance
                    product_ids = list(self._search(args + [('default_code', operator, name)], limit=limit))
                    if not limit or len(product_ids) < limit:
                        # we may underrun the limit because of dupes in the results, that's fine
                        limit2 = (limit - len(product_ids)) if limit else False
                        product2_ids = self._search(args + [('name', operator, name), ('id', 'not in', product_ids)], limit=limit2, access_rights_uid=name_get_uid)
                        product_ids.extend(product2_ids)
                elif not product_ids and operator in expression.NEGATIVE_TERM_OPERATORS:
                    domain = expression.OR([
                        ['&', ('default_code', operator, name), ('name', operator, name)],
                        ['&', ('default_code', '=', False), ('name', operator, name)],
                    ])
                    domain = expression.AND([args, domain])
                    product_ids = list(self._search(domain, limit=limit, access_rights_uid=name_get_uid))
                if not product_ids and operator in positive_operators:
                    ptrn = re.compile('(\[(.*?)\])')
                    res = ptrn.search(name)
                    if res:
                        product_ids = list(self._search([('default_code', '=', res.group(2))] + args, limit=limit, access_rights_uid=name_get_uid))
                # still no results, partner in context: search on supplier info as last hope to find something
                if not product_ids and self._context.get('partner_id'):
                    suppliers_ids = self.env['product.supplierinfo']._search([
                        ('partner_id', '=', self._context.get('partner_id')),
                        '|',
                        ('product_code', operator, name),
                        ('product_name', operator, name)], access_rights_uid=name_get_uid)
                    if suppliers_ids:
                        product_ids = self._search([('product_tmpl_id.seller_ids', 'in', suppliers_ids)], limit=limit, access_rights_uid=name_get_uid)

                # Search Record base on Multi Barcode


                product_barcode_ids = self.env['product.barcode']._search([
                ('barcode', operator, name), ('model_ids.name', "=", model_name)], access_rights_uid=name_get_uid)
                if product_barcode_ids:

                    product_ids = product_ids + list(self._search([
                        '|',
                        ('product_barcode', 'in', product_barcode_ids),
                        ('product_tmpl_id.product_barcode', 'in', product_barcode_ids)],
                        limit=limit, access_rights_uid=name_get_uid))

            else:
                product_ids = self._search(args, limit=limit, access_rights_uid=name_get_uid)
            return product_ids
        else:
            if not args:
                args = []
            if name:
                positive_operators = ['=', 'ilike', '=ilike', 'like', '=like']
                product_ids = []
                model_name = []
                if operator in positive_operators:
                    product_ids = list(self._search([('default_code', '=', name)] + args, limit=limit, access_rights_uid=name_get_uid))
                    if not product_ids:
                        product_ids = list(self._search([('barcode', '=', name) or ('product_barcode.barcode', '=', name)] + args, limit=limit, access_rights_uid=name_get_uid))
                if not product_ids and operator not in expression.NEGATIVE_TERM_OPERATORS:
                    # Do not merge the 2 next lines into one single search, SQL search performance would be abysmal
                    # on a database with thousands of matching products, due to the huge merge+unique needed for the
                    # OR operator (and given the fact that the 'name' lookup results come from the ir.translation table
                    # Performing a quick memory merge of ids in Python will give much better performance
                    product_ids = list(self._search(args + [('default_code', operator, name)], limit=limit))
                    if not limit or len(product_ids) < limit:
                        # we may underrun the limit because of dupes in the results, that's fine
                        limit2 = (limit - len(product_ids)) if limit else False
                        product2_ids = self._search(args + [('name', operator, name), ('id', 'not in', product_ids)], limit=limit2, access_rights_uid=name_get_uid)
                        product_ids.extend(product2_ids)
                elif not product_ids and operator in expression.NEGATIVE_TERM_OPERATORS:
                    domain = expression.OR([
                        ['&', ('default_code', operator, name), ('name', operator, name)],
                        ['&', ('default_code', '=', False), ('name', operator, name)],
                    ])
                    domain = expression.AND([args, domain])
                    product_ids = list(self._search(domain, limit=limit, access_rights_uid=name_get_uid))
                if not product_ids and operator in positive_operators:
                    ptrn = re.compile('(\[(.*?)\])')
                    res = ptrn.search(name)
                    if res:
                        product_ids = list(self._search([('default_code', '=', res.group(2))] + args, limit=limit, access_rights_uid=name_get_uid))
                # still no results, partner in context: search on supplier info as last hope to find something
                if not product_ids and self._context.get('partner_id'):
                    suppliers_ids = self.env['product.supplierinfo']._search([
                        ('partner_id', '=', self._context.get('partner_id')),
                        '|',
                        ('product_code', operator, name),
                        ('product_name', operator, name)], access_rights_uid=name_get_uid)
                    if suppliers_ids:
                        product_ids = self._search([('product_tmpl_id.seller_ids', 'in', suppliers_ids)], limit=limit, access_rights_uid=name_get_uid)

                # Search Record base on Multi Barcode


                product_barcode_ids = self.env['product.barcode']._search([
                ('barcode', operator, name)], access_rights_uid=name_get_uid)
                if product_barcode_ids:

                    product_ids = product_ids + list(self._search([
                        ('product_tmpl_id.product_barcode', 'in', product_barcode_ids)],
                        limit=limit, access_rights_uid=name_get_uid))

            else:
                product_ids = self._search(args, limit=limit, access_rights_uid=name_get_uid)
            return product_ids


class Barcode(models.Model):
    _name = 'product.barcode'
    _description = "Product Barcode"

    product_id = fields.Many2one('product.product')
    barcode = fields.Char(string='Barcode',required=True)
    product_tmpl_id = fields.Many2one('product.template')
    company_id = fields.Many2one('res.company', 'Company', default=lambda self: self.env.user.company_id)
    multi_barcode_for_product = fields.Boolean(related='company_id.multi_barcode_for_product', string="Multi Barcode For Product")
    model_ids = fields.Many2one('ir.model',string ='Used For')

    _sql_constraints = [
        ('uniq_barcode', 'unique(barcode)', "A barcode can only be assigned to one product !"),
    ]
