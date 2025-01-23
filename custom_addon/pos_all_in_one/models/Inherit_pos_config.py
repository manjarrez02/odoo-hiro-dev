# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class PosConfigInherit(models.Model):
	_inherit = 'pos.config'

	@api.model
	def default_get(self, default_fields):
		
		res = super(PosConfigInherit, self).default_get(default_fields)
		product = self.env['product.product'].search([('type', '=', 'service'),('available_in_pos', '=', True)], limit=1)
		if product:
			res['custdisc_product_id'] = product.id
		return res

	internal_transfer = fields.Boolean('Internal Stock ')
	custdisc_product_id = fields.Many2one("product.product",string="Customer Discount Product", domain = [('type', '=', 'service'),('available_in_pos', '=', True)])

	def open_ui(self):
		"""Open the pos interface with config_id as an extra argument.

		In vanilla PoS each user can only have one active session, therefore it was not needed to pass the config_id
		on opening a session. It is also possible to login to sessions created by other users.

		:returns: dict
		"""
		self.ensure_one()
		if not self.current_session_id:
			result = any(item.id == self.id for item in self.env.user.allow_configs)
			if result:
				self._check_before_creating_new_session()
			else:
				raise ValidationError(_("You are not allowed to open session you have to give user access."))
		self._validate_fields(self._fields)

		# check if there's any product for this PoS
		domain = [('available_in_pos', '=', True)]
		if self.limit_categories and self.iface_available_categ_ids:
			domain.append(('pos_categ_id', 'in', self.iface_available_categ_ids.ids))
		if not self.env['product.product'].search(domain):
			return {
				'name': _("There is no product linked to your PoS"),
				'type': 'ir.actions.act_window',
				'view_type': 'form',
				'view_mode': 'form',
				'res_model': 'pos.session.check_product_wizard',
				'target': 'new',
				'context': {'config_id': self.id}
			}
		return self._action_to_open_ui()


class ResConfigSettings(models.TransientModel):
	_inherit = 'res.config.settings'

	pos_internal_transfer = fields.Boolean(related='pos_config_id.internal_transfer', readonly=False)
	custdisc_product_id = fields.Many2one(related='pos_config_id.custdisc_product_id',readonly=False)

class PosOrderInherit(models.Model):
	_inherit = 'pos.session'

	def checking_product(self,product):
		product_details = []
		product_serv = []
		for i in product:
			product_obj = self.env['product.product'].search([('id','=',i.get('product_id')),('type','in',['consu','product'])])
			product_obj_service = self.env['product.product'].search([('id','=',i.get('product_id')),('type','=','service')])
			if product_obj:
				product_details.append(product_obj.id)
			else:
				product_serv.append(product_obj_service.id)
		return product_details, product_serv
			
	def generate_internal_picking(self,client,picking_type,src,dest,state,product):
		move_lines = []
		src_location = self.env['stock.location'].browse(int(src))
		dest_location = self.env['stock.location'].browse(int(dest))
		stock_picking_type = self.env['stock.picking.type'].browse(int(picking_type))
		# stock_move_line_obj = self.env['stock.move.line']
		product_details = []
		vals = {
			'company_id': self.config_id.company_id.id,
			'partner_id': client or False,
			'location_id': src_location.id,
			'location_dest_id': dest_location.id,
			'picking_type_id': stock_picking_type.id,
		}
		pick = self.env['stock.picking'].create(vals)
		if state=="Draft":
			lines = self.make_picking_line( picking_type,src,dest,state,product, pick)
		if state=='Waiting':
			lines = self.make_picking_line( picking_type,src,dest,state,product, pick)
			pick.action_confirm()
		if state=="Done":
			lines = self.make_picking_line( picking_type,src,dest,state,product, pick)
			pick.action_confirm()
			move_lines = self.make_done_picking_line(lines, picking_type,src,dest,state,product, pick)
			pick.button_validate()

		return pick.name 

	def make_picking_line(self, picking_type,src,dest,state,product, pick_id):
		# stock_lot_obj = self.env['stock.production.lot']
		stock_move_obj = self.env['stock.move']
		# stock_move_line_obj = self.env['stock.move.line']
		# src_location = self.env['stock.location'].browse(int(src))
		# dest_location = self.env['stock.location'].browse(int(dest))
		stock_picking_type = self.env['stock.picking.type'].browse(int(picking_type))
		moveids = []
		for i in product:
			product_obj = self.env['product.product'].search([('id','=',i.get('product_id')),('type','in',['consu','product'])])
			if product_obj:
				res = stock_move_obj.create({
				'product_id' : product_obj.id,
				'name':product_obj.name,
				'product_uom_qty' :i.get('quantity'),
				'picking_id':pick_id.id,
				'location_id':pick_id.location_id.id,
				'location_dest_id':pick_id.location_dest_id.id,
				'product_uom':product_obj.uom_id.id,
				'picking_type_id' :stock_picking_type.id

				})
				moveids.append(res)
															  
		return moveids

	def make_done_picking_line(self,move, picking_type,src,dest,state,product, pick_id):
		# stock_lot_obj = self.env['stock.production.lot']
		stock_move_line_obj = self.env['stock.move.line']
		src_location = self.env['stock.location'].browse(int(src))
		dest_location = self.env['stock.location'].browse(int(dest))
		stock_picking_type = self.env['stock.picking.type'].browse(int(picking_type))
		for j in move:
			stock_move_obj = self.env['stock.move'].browse(j.id)
			for i in product:
				product_obj = self.env['product.product'].search([('id','=',i.get('product_id')),('type','in',['consu','product'])])
				if product_obj:
					if stock_move_obj.product_id.id == i.get('product_id'):
						res = stock_move_line_obj.create({
							'location_id':pick_id.location_id.id,
							'location_dest_id':pick_id.location_dest_id.id,
							'qty_done':i.get('quantity'),
							'product_id': product_obj.id,
							'move_id':stock_move_obj.id,
							'lot_id':False,
							'picking_id':stock_move_obj.picking_id.id,
							'product_uom_id':product_obj.uom_id.id,
						})
		return True