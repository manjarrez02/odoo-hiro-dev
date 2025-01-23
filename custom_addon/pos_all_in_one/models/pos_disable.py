# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, _

class ResUsers(models.Model):
    _inherit = 'res.users'

    is_allow_numpad=fields.Boolean("Allow Numpad")
    is_allow_payments = fields.Boolean('Allow Payments')
    is_allow_discount = fields.Boolean('Allow Discount')
    is_allow_qty = fields.Boolean('Allow Qty')
    is_edit_price = fields.Boolean('Allow Edit Price')
    is_allow_remove_orderline = fields.Boolean('Allow Remove Order Line')
    is_allow_customer_selection=fields.Boolean("Allow Customer Selection")
    is_allow_plus_minus_button=fields.Boolean("Allow +/- Button")
    is_allow_refund=fields.Boolean("Allow Refund")
    is_allow_info=fields.Boolean("Allow Info")
    is_allow_customer_note=fields.Boolean("Allow Customer Note")
    is_allow_quotation_order=fields.Boolean("Allow Quotation/Order")
    is_allow_sales_order=fields.Boolean("Allow Create Sales Order")
    is_allow_coupon=fields.Boolean("Allow Coupon")
    allow_configs = fields.Many2many("pos.config" ,string="Allow Pos Config")
    allow_customer_limit_exceeded=fields.Boolean("Allow Customer Limit Exceeded")
    add_pin=fields.Char("Add Pin for Customer Limit Exceeded")

    is_allow_loc_summery = fields.Boolean('Allow Audit Report')

    is_allow_order_summery = fields.Boolean('Allow Order Summary')
    is_allow_product_summery = fields.Boolean('Allow Product Summary')
    is_allow_product_categ_summery = fields.Boolean('Allow Product Category Summary')
    is_allow_payment_summery = fields.Boolean('Allow Payment Summary')

    is_allow_return_order_barcode = fields.Boolean('Allow Return order with barcode')
    is_allow_orders = fields.Boolean('Allow Orders')
    is_allow_sale_orders = fields.Boolean('Allow Sales Orders')
    is_allow_draft_order = fields.Boolean('Allow Draft Orders')
    is_allow_find_order = fields.Boolean('Allow Find Orders')
    is_allow_products = fields.Boolean('Allow Products')
    is_allow_payment_action = fields.Boolean('Allow Payment')
    is_allow_invoice = fields.Boolean('Allow Inovice')
    is_allow_internal_transfer = fields.Boolean('Allow Internal Transfer')

    is_allow_enter_code = fields.Boolean('Allow Enter code')
    is_allow_reset_programs = fields.Boolean('Allow Reset Programs')
    is_allow_reward = fields.Boolean('Allow Reward')


    @api.onchange('is_allow_enter_code','is_allow_reset_programs','is_allow_reward','is_allow_internal_transfer','is_allow_invoice','is_allow_products','is_allow_find_order','is_allow_draft_order','is_allow_sale_orders',
        'is_allow_orders','is_allow_return_order_barcode','is_allow_payment_action', 'is_allow_order_summery', 'is_allow_product_summery', 
        'is_allow_product_categ_summery', 'is_allow_loc_summery', 'is_allow_payment_summery', 'is_allow_numpad', 'is_allow_payments', 'is_allow_discount',
         'is_allow_qty','is_edit_price','is_allow_quotation_order', 'is_allow_sales_order', 'is_allow_coupon', 'is_allow_remove_orderline',
         'is_allow_refund','is_allow_info','is_allow_customer_note', 'is_allow_customer_selection', 'is_allow_plus_minus_button')
    def _update_hr_settings(self):
        for user in self.with_context(active_test=False):
            user.employee_id.update({
                'is_allow_numpad': user.is_allow_numpad,
                'is_allow_payments': user.is_allow_payments,
                'is_allow_discount': user.is_allow_discount,
                'is_allow_qty': user.is_allow_qty,
                'is_edit_price': user.is_edit_price,
                'is_allow_remove_orderline': user.is_allow_remove_orderline,
                'is_allow_customer_selection': user.is_allow_customer_selection,
                'is_allow_plus_minus_button': user.is_allow_plus_minus_button,
                'is_allow_refund': user.is_allow_refund,
                'is_allow_info': user.is_allow_info,
                'is_allow_customer_note': user.is_allow_customer_note,
                'is_allow_quotation_order': user.is_allow_quotation_order,
                'is_allow_sales_order': user.is_allow_sales_order,
                'is_allow_coupon': user.is_allow_coupon,
                'is_allow_payment_action': user.is_allow_payment_action,
                'is_allow_order_summery': user.is_allow_order_summery,
                'is_allow_product_summery': user.is_allow_product_summery,
                'is_allow_product_categ_summery': user.is_allow_product_categ_summery,
                'is_allow_loc_summery': user.is_allow_loc_summery,
                'is_allow_payment_summery': user.is_allow_payment_summery,
                'is_allow_return_order_barcode': user.is_allow_return_order_barcode,
                'is_allow_orders': user.is_allow_orders,
                'is_allow_sale_orders': user.is_allow_sale_orders,
                'is_allow_draft_order': user.is_allow_draft_order,
                'is_allow_find_order': user.is_allow_find_order,
                'is_allow_products': user.is_allow_products,
                'is_allow_invoice': user.is_allow_invoice,
                'is_allow_internal_transfer': user.is_allow_internal_transfer,
                'is_allow_enter_code': user.is_allow_enter_code,
                'is_allow_reset_programs': user.is_allow_reset_programs,
                'is_allow_reward': user.is_allow_reward
            })


class HrEmployeeBase(models.AbstractModel):
    _inherit = "hr.employee.base"

    is_allow_numpad=fields.Boolean("Allow Numpad")
    is_allow_payments = fields.Boolean('Allow Payments')
    is_allow_discount = fields.Boolean('Allow Discount')
    is_allow_qty = fields.Boolean('Allow Qty')
    is_edit_price = fields.Boolean('Allow Edit Price')
    is_allow_remove_orderline = fields.Boolean('Allow Remove Order Line')
    is_allow_customer_selection=fields.Boolean("Allow Customer Selection")
    is_allow_plus_minus_button=fields.Boolean("Allow +/- Button")
    is_allow_refund=fields.Boolean("Allow Refund")
    is_allow_info=fields.Boolean("Allow Info")
    is_allow_customer_note=fields.Boolean("Allow Customer Note")
    is_allow_quotation_order=fields.Boolean("Allow Quotation/Order")
    is_allow_sales_order=fields.Boolean("Allow Create Sales Order")
    is_allow_coupon=fields.Boolean("Allow Coupon")

    is_allow_loc_summery = fields.Boolean('Allow Audit Report')
    
    is_allow_order_summery = fields.Boolean('Allow Order Summary')
    is_allow_product_summery = fields.Boolean('Allow Product Summary')
    is_allow_product_categ_summery = fields.Boolean('Allow Product product Summary')
    is_allow_payment_summery = fields.Boolean('Allow Payment Summary')

    is_allow_return_order_barcode = fields.Boolean('Allow Return order with barcode')
    is_allow_orders = fields.Boolean('Allow Orders')
    is_allow_sale_orders = fields.Boolean('Allow Sales Orders')
    is_allow_draft_order = fields.Boolean('Allow Draft Orders')
    is_allow_find_order = fields.Boolean('Allow Find Orders')
    is_allow_products = fields.Boolean('Allow Products')
    is_allow_payment_action = fields.Boolean('Allow Payment')
    is_allow_invoice = fields.Boolean('Allow Inovice')
    is_allow_internal_transfer = fields.Boolean('Allow Internal Transfer')

    is_allow_enter_code = fields.Boolean('Allow Enter code')
    is_allow_reset_programs = fields.Boolean('Allow Reset Programs')
    is_allow_reward = fields.Boolean('Allow Reward')


class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    def open_employee_user(self):
        self.ensure_one()
        return {'type': 'ir.actions.act_window',
                'res_model': 'res.users',
                'view_mode': 'form',
                'res_id': self.user_id.id,
                'target': 'current',
                }