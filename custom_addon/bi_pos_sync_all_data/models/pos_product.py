# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
import json

class pos_config(models.Model):
	_inherit = 'pos.config'

	allow_pos_sync_data = fields.Boolean(string='POS Sync Data Config')

class ResConfigSettings(models.TransientModel):
	_inherit = 'res.config.settings'

	pos_allow_pos_sync_data = fields.Boolean(related='pos_config_id.allow_pos_sync_data',readonly=False)
'''
class stock_quant(models.Model):
	_inherit = 'stock.move'

	@api.model
	def sync_product(self, prd_id):
		notifications = []
		pos_configs = self.env['pos.config'].sudo().search([('allow_pos_sync_data', '=', True)])
		for config in pos_configs:
			if config:
				ssn_obj = self.env['pos.session'].sudo()
				prod_obj = self.env['product.product'].sudo()
				prod_fields = ssn_obj._loader_params_product_product()['search_params']['fields']
				product = prod_obj.search_read([('id', '=', prd_id),('available_in_pos','=',True)], prod_fields)
				# product_id = prod_obj.search([('id', '=', prd_id)])
				if product:
					categories = ssn_obj._get_pos_ui_product_category(ssn_obj._loader_params_product_category())
					product_category_by_id = {category['id']: category for category in categories}
					if product_category_by_id:
						product[0]['categ'] = product_category_by_id[product[0]['categ_id'][0]]

					vals = {
						'id': [product[0].get('id')],
						'product': product,
						'access': 'pos.sync.product',
					}
					notifications.append([config.current_user_id.partner_id, 'product.product/sync_data', vals])
		if len(notifications) > 0:
			self.env['bus.bus']._sendmany(notifications)
		return True



	@api.model_create_multi
	def create(self, vals_list):
		res = super(stock_quant, self).create(vals_list)

		notifications = []
		for rec in res:
			rec.sync_product(rec.product_id.id)
		return res

	def write(self, vals):
		res = super(stock_quant, self).write(vals)
		notifications = []
		for rec in self:
			rec.sync_product(rec.product_id.id)
		return res
'''
		
class BiResPartner(models.Model):
	_inherit = 'res.partner'

	@api.model
	def sync_partner(self, partner):

		notifications = []
		pos_configs = self.env['pos.config'].sudo().search([('allow_pos_sync_data', '=', True)])
		for config in pos_configs:
			if config:
				ssn_obj = self.env['pos.session'].sudo()
				partner_fields = ssn_obj._loader_params_res_partner()['search_params']['fields']
				partner = self.search_read([('id', '=', partner)], partner_fields)
				if partner:


					vals = {
						'id': [partner[0].get('id')],
						'partner': partner,
						'access': 'res.partner/sync_data',
					}
					notifications.append([config.current_user_id.partner_id, 'res.partner/sync_data', vals])
		if len(notifications) > 0:
			self.env['bus.bus']._sendmany(notifications)
		return True
		


	@api.model_create_multi
	def create(self, vals_list):
		res = super(BiResPartner, self).create(vals_list)
		for rec in res:
			rec.sync_partner(rec.id)
		return res

	def write(self, vals):
		res = super(BiResPartner, self).write(vals)
		for i in self:
			i.sync_partner(i._origin.id)
		return res

'''
class ProductTemplate(models.Model):
	_inherit = 'product.template'

	def write(self, vals):
		res = super(ProductTemplate, self).write(vals)
		for rec in self:
			for pv in rec.product_variant_ids :
				pv.sync_product(pv.id)
		return res
'''
'''
class PosSession(models.Model):
	_inherit = 'pos.session'



	def _loader_params_product_product(self):
		result = super()._loader_params_product_product()
		result['search_params']['fields'].extend(['type','virtual_available',
					'qty_available','incoming_qty','outgoing_qty','quant_text'])
		return result
'''

'''
class ProductProduct(models.Model):
	_inherit = 'product.product'

	quant_text = fields.Text('Quant Qty',compute='_compute_avail_locations', store=False)

	@api.depends('stock_quant_ids','stock_quant_ids.product_id', 'stock_quant_ids.location_id', 'stock_quant_ids.quantity')
	def _compute_avail_locations(self):
		for rec in self:
			quants = self.env['stock.quant'].sudo().search(
				[('product_id', 'in', rec.ids)])

			total = 0
			for quant in quants.mapped('quantity'):
				total += quant

			rec.quant_text = rec.qty_available + total

		return True

	@api.model
	def sync_product(self, prd_id):
		notifications = []
		pos_configs = self.env['pos.config'].sudo().search([('allow_pos_sync_data', '=', True)])
		for config in pos_configs:
			if config:
				ssn_obj = self.env['pos.session'].sudo()
				prod_fields = ssn_obj._loader_params_product_product()['search_params']['fields']
				product = self.search_read([('id', '=', prd_id),('available_in_pos','=',True)], prod_fields)
				product_id = self.search([('id', '=', prd_id)])
				if product:
					categories = ssn_obj._get_pos_ui_product_category(ssn_obj._loader_params_product_category())
					product_category_by_id = {category['id']: category for category in categories}
					if product_category_by_id:
						product[0]['categ'] = product_category_by_id[product[0]['categ_id'][0]]

					vals = {
						'id': [product[0].get('id')],
						'product': product,
						'access': 'pos.sync.product',
					}
					notifications.append([config.current_user_id.partner_id, 'product.product/sync_data', vals])
		if len(notifications) > 0:
			self.env['bus.bus']._sendmany(notifications)
		return True

	@api.model_create_multi
	def create(self, vals_list):
		res = super(ProductProduct, self).create(vals_list)
		for rec in res:
			self.sync_product(rec.id)
		return res

	def write(self, vals):
		res = super(ProductProduct, self).write(vals)
		for i in self:
			i.sync_product(i._origin.id)
		return res
'''		
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:    
