# -*- coding: utf-8 -*-

from odoo import api, fields, models
from odoo.http import request


class IrUiMenu(models.Model):
    _inherit = 'ir.ui.menu'

    @api.model
    def search(self, args, offset=0, limit=None, order=None, count=False):
        """Hide menu which is selected inside User management only for the selected users"""
        menu_ids = super(IrUiMenu, self).search(args, offset=0, limit=None, order=order, count=False)
        current_user = self.env.user
        company_ids = request.httprequest.cookies.get('cids') if request.httprequest.cookies.get('cids') else False
        current_user.clear_caches()
        if company_ids:
            lst = [int(x) for x in request.httprequest.cookies.get('cids').split(',')]
            ks_hide_menu_ids = self.env['user.management'].sudo().search(
                [('ks_user_ids', 'in', current_user.ids), ('active', '=', True), ('ks_company_ids', 'in', lst)]).mapped(
                'ks_hide_menu_ids')
        else:
            ks_hide_menu_ids = self.env['user.management'].search(
                [('ks_user_ids', 'in', current_user.ids), ('active', '=', True)]).mapped(
                'ks_hide_menu_ids')
        menu_ids = menu_ids - ks_hide_menu_ids
        return menu_ids
