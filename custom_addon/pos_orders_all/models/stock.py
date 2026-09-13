# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, _
from odoo.exceptions import Warning, UserError, ValidationError
from odoo.tools import float_is_zero
import json
import logging

_logger = logging.getLogger(__name__)


class stock_quant(models.Model):
	_inherit = 'stock.move'

	@api.model
	def sync_product(self, prd_id):
		if not prd_id:
			return True

		prod_fields = [
			'id', 'name', 'display_name', 'categ_id', 'pos_categ_id',
			'available_in_pos', 'type', 'barcode', 'default_code',
			'product_tmpl_id', 'product_template_attribute_value_ids',
			'uom_id', 'description_sale',
		]
		prod_obj = self.env['product.product'].sudo()
		product = prod_obj.with_context(display_default_code=False).search_read(
			[('id', '=', prd_id)], prod_fields)

		if not product:
			return True

		# Calcular existencias por ubicación para todas las ubicaciones internas mediante SQL agrupado
		quant_dict = {}
		total_available = 0.0
		total_on_hand = 0.0
		try:
			self.env.cr.execute("""
				SELECT sq.location_id,
				       COALESCE(SUM(sq.quantity - sq.reserved_quantity), 0.0) AS qty_available,
				       COALESCE(SUM(sq.quantity), 0.0) AS qty_on_hand
				  FROM stock_quant sq
				  JOIN stock_location sl ON sl.id = sq.location_id
				 WHERE sq.product_id = %s
				   AND sl.usage = 'internal'
				 GROUP BY sq.location_id
			""", (prd_id,))
			rows = self.env.cr.dictfetchall()
			for row in rows:
				loc_key = str(row['location_id'])
				quant_dict[loc_key] = [row['qty_on_hand'], 0, 0]
				total_available += row['qty_available']
				total_on_hand += row['qty_on_hand']
		except Exception as e:
			_logger.warning("sync_product: error calculando stock para producto %s: %s", prd_id, e)

		# Asegurar que las ubicaciones de stock de las sesiones POS abiertas estén en quant_dict
		open_sessions = self.env['pos.session'].sudo().search([('state', 'in', ['opened', 'opening_control'])])
		for ssn in open_sessions:
			cfg = ssn.config_id
			loc = cfg.stock_location_id if cfg else False
			if not loc and cfg and cfg.picking_type_id:
				loc = cfg.picking_type_id.default_location_src_id
			if loc and str(loc.id) not in quant_dict:
				quant_dict[str(loc.id)] = [0.0, 0, 0]

		product[0]['qty_available'] = total_available
		product[0]['virtual_available'] = total_available
		product[0]['bi_qty_available'] = total_available
		product[0]['bi_virtual_available'] = total_available
		product[0]['quant_text'] = json.dumps(quant_dict)

		# Categoría específica del producto
		if product[0].get('categ_id'):
			categ_id = product[0]['categ_id'][0] if isinstance(product[0]['categ_id'], (list, tuple)) else product[0]['categ_id']
			categ = self.env['product.category'].sudo().browse(categ_id)
			product[0]['categ'] = {'id': categ.id, 'name': categ.name, 'parent_id': categ.parent_id.id if categ.parent_id else False}
		else:
			product[0]['categ'] = {}

		vals = {
			'id': [product[0].get('id')],
			'product': product,
			'access': 'pos.sync.product',
		}

		# Notificar a todos los usuarios de sesiones POS abiertas y al usuario actual
		partners_to_notify = set()
		for ssn in open_sessions:
			if ssn.user_id and ssn.user_id.partner_id:
				partners_to_notify.add(ssn.user_id.partner_id)
		if self.env.user and self.env.user.partner_id:
			partners_to_notify.add(self.env.user.partner_id)

		notifications = [[partner, 'product.product/sync_data', vals] for partner in partners_to_notify]
		if notifications:
			self.env['bus.bus']._sendmany(notifications)
		return True

	@api.model
	def create(self, vals):
		res = super(stock_quant, self).create(vals)
		product_ids = {rec.product_id.id for rec in res if rec.product_id}
		if product_ids:
			products = self.env['product.product'].browse(list(product_ids))
			products._compute_avail_locations()
			for pid in product_ids:
				self.sync_product(pid)
		return res

	def write(self, vals):
		res = super(stock_quant, self).write(vals)
		product_ids = {rec.product_id.id for rec in self if rec.product_id}
		if product_ids:
			products = self.env['product.product'].browse(list(product_ids))
			products._compute_avail_locations()
			for pid in product_ids:
				self.sync_product(pid)
		return res



class product(models.Model):
	_inherit = 'product.product'
	
	quant_ids = fields.One2many("stock.quant", "product_id", string="Quants",
								domain=[('location_id.usage', '=', 'internal')])

	quant_text = fields.Text('Quant Qty', compute='_compute_avail_locations', store=True)

	@api.depends('stock_quant_ids', 'stock_quant_ids.product_id', 'stock_quant_ids.location_id',
				 'stock_quant_ids.quantity')
	def _compute_avail_locations(self):
		products = self.filtered(lambda p: p.type == 'product')
		(self - products).quant_text = json.dumps({})
		if not products:
			return True

		# Agregación en lote mediante read_group para evitar búsquedas N+1 en bucle
		quants_data = self.env['stock.quant'].sudo().read_group(
			[('product_id', 'in', products.ids), ('location_id.usage', '=', 'internal')],
			['product_id', 'location_id', 'quantity:sum'],
			['product_id', 'location_id'],
			lazy=False
		)
		stock_map = {}
		for item in quants_data:
			p_id = item['product_id'][0]
			l_id = item['location_id'][0]
			qty = item.get('quantity', 0.0)
			if p_id not in stock_map:
				stock_map[p_id] = {}
			stock_map[p_id][l_id] = [qty, 0, 0]

		for rec in products:
			rec.quant_text = json.dumps(stock_map.get(rec.id, {}))
		return True


class StockPicking(models.Model):
	_inherit='stock.picking'

	@api.model
	def _create_picking_from_pos_order_lines(self, location_dest_id, lines, picking_type, partner=False):
		"""We'll create some picking based on order_lines"""

		pickings = self.env['stock.picking']
		stockable_lines = lines.filtered(
			lambda l: l.product_id.type in ['product', 'consu'] and not float_is_zero(l.qty,
																					  precision_rounding=l.product_id.uom_id.rounding))
		if not stockable_lines:
			return pickings
		positive_lines = stockable_lines.filtered(lambda l: l.qty > 0)
		negative_lines = stockable_lines - positive_lines

		if positive_lines:
			pos_order = positive_lines[0].order_id
			location_id = pos_order.location_id.id
			vals = self._prepare_picking_vals(partner, picking_type, location_id, location_dest_id)
			positive_picking = self.env['stock.picking'].create(vals)
			positive_picking._create_move_from_pos_order_lines(positive_lines)
			try:
				with self.env.cr.savepoint():
					positive_picking._action_done()
			except (UserError, ValidationError):
				pass

			pickings |= positive_picking
		if negative_lines:
			if picking_type.return_picking_type_id:
				return_picking_type = picking_type.return_picking_type_id
				return_location_id = return_picking_type.default_location_dest_id.id
			else:
				return_picking_type = picking_type
				return_location_id = picking_type.default_location_src_id.id

			vals = self._prepare_picking_vals(partner, return_picking_type, location_dest_id, return_location_id)
			negative_picking = self.env['stock.picking'].create(vals)
			negative_picking._create_move_from_pos_order_lines(negative_lines)
			try:
				with self.env.cr.savepoint():
					negative_picking._action_done()
			except (UserError, ValidationError):
				pass
			pickings |= negative_picking
		return pickings