# -- coding: utf-8 --
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################

from odoo import api, models, fields


class PosSession(models.Model):
    _inherit = 'pos.session'

    def _pos_ui_models_to_load(self):
        result = super()._pos_ui_models_to_load()
        if self.config_id.customer_display:
            result.append('customer.display')
            result.append('ad.video')
        return result

    def _loader_params_customer_display(self):
        return {
            'search_params': {
                'domain': [],
                'fields': [],
            },
        }

    def _get_pos_ui_customer_display(self, params):
        return self.env['customer.display'].search_read(**params['search_params'])

    def _loader_params_ad_video(self):
        return {
            'search_params': {
                'domain': [],
                'fields': [],
            },
        }

    def _get_pos_ui_ad_video(self, params):
        return self.env['ad.video'].search_read(**params['search_params'])

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4: