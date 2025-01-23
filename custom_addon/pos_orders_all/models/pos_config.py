# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, _
from datetime import date, datetime


class ResConfigSettings(models.TransientModel):
	_inherit = 'res.config.settings'

	# pos orders screen
	show_order = fields.Boolean('Show Orders',related="pos_config_id.show_order",readonly=False,)
	pos_session_limit = fields.Selection(related="pos_config_id.pos_session_limit", readonly=False, string='Session limit',)
	show_barcode = fields.Boolean('Show Barcode in Receipt',related="pos_config_id.show_barcode",readonly=False)
	show_draft = fields.Boolean('Show Draft Orders',related="pos_config_id.show_draft",readonly=False)
	show_posted = fields.Boolean('Show Posted Orders',related="pos_config_id.show_posted",readonly=False)

	# import sale functionality
	pos_check = fields.Boolean(related='pos_config_id.check', readonly=False)
	pos_load_orders_days = fields.Integer(related='pos_config_id.load_orders_days', readonly=False)
	pos_load_draft_sent = fields.Boolean(related='pos_config_id.load_draft_sent', readonly=False)
	pos_cancle_order = fields.Boolean(related='pos_config_id.cancle_order', readonly=False)

	credit_note = fields.Selection(related="pos_config_id.credit_note", readonly=False, string = "Credit note configuration")

	#Invoice auto check
	auto_check_invoice = fields.Boolean(related='pos_config_id.auto_check_invoice', readonly=False ,string='Invoice Auto Check')

	#pos stock
	pos_display_stock = fields.Boolean(related='pos_config_id.pos_display_stock',readonly=False)
	pos_restrict_product = fields.Boolean(related='pos_config_id.pos_restrict_product',readonly=False)
	pos_stock_type = fields.Selection(related='pos_config_id.pos_stock_type',readonly=False)
	show_stock_location = fields.Selection(string='Show Stock Of',readonly=False, related="pos_config_id.show_stock_location")
	stock_location_id = fields.Many2one(
		'stock.location', string='Stock Location',
		domain=[('usage', '=', 'internal')], required=True, related="pos_config_id.stock_location_id",readonly=False)

	
	# bag charges functionality
	pos_bag_category_id = fields.Many2one('pos.category',related='pos_config_id.pos_bag_category_id',readonly=False,string='Bag Charges Category')
	allow_bag_charges = fields.Boolean(related="pos_config_id.allow_bag_charges", readonly=False, string='Allow Bag Charges')

	#discount
	discount_type = fields.Selection(related='pos_config_id.discount_type',readonly=False,required=True)

	module_loyalty = fields.Boolean(related='pos_config_id.module_loyalty',readonly=False,)
	pos_res_partner_id = fields.Many2one(related='pos_config_id.res_partner_id', readonly=False)



class pos_config(models.Model):
	_inherit = 'pos.config'

	def _get_default_location(self):
		return self.env['stock.warehouse'].search([('company_id', '=', self.env.user.company_id.id)], limit=1).lot_stock_id
	
	
	# pos orders screen
	show_order = fields.Boolean('Show Orders')
	pos_session_limit = fields.Selection([('all',  "Load all Session's Orders"), ('last3', "Load last 3 Session's Orders"), ('last5', " Load last 5 Session's Orders"),('current_day', "Only Current Day Orders"), ('current_session', "Only Current Session's Orders")], string='Session limit',default="current_day")
	show_barcode = fields.Boolean('Show Barcode in Receipt')
	show_draft = fields.Boolean('Show Draft Orders')
	show_posted = fields.Boolean('Show Posted Orders')


	module_loyalty = fields.Boolean(string="Promotions, Coupons, Gift Card & Loyalty Program")
	res_partner_id = fields.Many2one('res.partner', string="default Customer")
	# import sale functionality
	check = fields.Boolean(string='Import Sale Order', default=False)
	load_orders_days = fields.Integer('Load Orders of Last Days')
	load_draft_sent = fields.Boolean(string='Load only draft/sent sale orders', default=False)
	cancle_order = fields.Boolean(string='Cancel Sale Order after Import', default=False)

	# bag charges functionality
	pos_bag_category_id = fields.Many2one('pos.category', 'Bag Charges Category')
	allow_bag_charges = fields.Boolean('Allow Bag Charges')

	auto_check_invoice = fields.Boolean(string='Invoice Auto Check') 

	# discount
	discount_type = fields.Selection([('percentage', "Percentage"), 
		('fixed', "Fixed")], string='Discount Type', default='percentage', 
		help='Seller can apply different Discount Type in POS.')


	# pos stock
	pos_display_stock = fields.Boolean(string='Display Stock in POS')
	pos_restrict_product = fields.Boolean(string='Restrict Product Out of Stock in POS')
	pos_stock_type = fields.Selection(
		[('onhand', 'Qty on Hand'), ('virtual', 'Virtual Qty'), ('both', 'Both')], string='Stock Type',default='onhand')
	show_stock_location = fields.Selection([('all', 'All Warehouse'),
		('specific', 'Current Session Warehouse')],default='all',string='Show Stock Of')
	stock_location_id = fields.Many2one(
		'stock.location', string='Stock Location',
		domain=[('usage', '=', 'internal')], required=True, 
		default=_get_default_location)

	# Credit note
	credit_note = fields.Selection([('create_note','Create Return order Credit note'),
		('not_create_note','Do not Create Return order Credit note')], string = "Credit note configuration" , default = "create_note")
