# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _


class Inherit_res_user(models.Model):
	_inherit = 'res.users'

	warehouses_id = fields.Many2one('stock.warehouse',string="Default Warehouse ",
		company_dependent=True)

class SaleOrder(models.Model):
	_inherit = 'sale.order'

	@api.model
	def default_get(self, fields):
		res = super(SaleOrder, self).default_get(fields)
		user = self.env.user 
		crnt_wh = res.get('warehouse_id',False)
		company = self.env.company.id

		if user.warehouses_id :
			crnt_wh =  user.warehouses_id
		else:
			crnt_wh = self.env['stock.warehouse'].search([('company_id', '=', company)], limit=1)

		if 'warehouse_id' in fields:
			res.update({
				'warehouse_id' :crnt_wh.id,
			})
		return res


	@api.onchange('company_id')
	def _onchange_company_id(self):
		if self.company_id:
			user = self.env.user 
			if user.warehouses_id :
				self.warehouse_id = user.warehouses_id
			else:
				warehouse_id = self.env['ir.default'].get_model_defaults('sale.order').get('warehouse_id')
				self.warehouse_id = warehouse_id or self.env['stock.warehouse'].search([('company_id', '=', self.company_id.id)], limit=1)


	@api.onchange('user_id')
	def warehouse_get(self):
		if self.user_id.warehouses_id:
			self.warehouse_id = self.user_id.warehouses_id.id