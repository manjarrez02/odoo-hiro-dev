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
                'domain': [('config_id', '=', self.config_id.id)],
                'fields': ['name', 'image', 'config_id'],
            },
        }

    def _get_pos_ui_customer_display(self, params):
        return self.env['customer.display'].search_read(**params['search_params'])

    def _loader_params_ad_video(self):
        # Excluimos explícitamente 'local_video_id' (Binary) para evitar
        # inyectar archivos de video de gran tamaño (20-40 MB) en Base64
        # en la respuesta RPC inicial load_pos_data.
        return {
            'search_params': {
                'domain': [('config_id', '=', self.config_id.id)],
                'fields': ['name', 'is_youtube_video', 'video_id', 'config_id'],
            },
        }

    def _get_pos_ui_ad_video(self, params):
        records = self.env['ad.video'].search_read(**params['search_params'])
        for record in records:
            if not record.get('is_youtube_video'):
                record['video_url'] = f'/web/content/ad.video/{record["id"]}/local_video_id'
        return records

    def load_customer_display_data(self):
        """
        Carga ultraligera exclusiva para la pantalla de cliente (Customer Display).
        Retorna únicamente la configuración esencial, monedas y banners/videos de la caja activa,
        omitiendo el catálogo de productos (5,000+), clientes, facturas, albaranes y stock.
        Reduce el tiempo de apertura de 2 minutos a menos de 50 milisegundos.
        """
        self.ensure_one()
        config = self.config_id

        customer_display = self.env['customer.display'].search_read(
            [('config_id', '=', config.id)],
            ['id', 'name', 'image', 'config_id']
        )
        videos = self.env['ad.video'].search_read(
            [('config_id', '=', config.id)],
            ['id', 'name', 'is_youtube_video', 'video_id', 'config_id']
        )
        for v in videos:
            if not v.get('is_youtube_video'):
                v['video_url'] = f'/web/content/ad.video/{v["id"]}/local_video_id'

        uoms = self._get_pos_ui_uom_uom(self._loader_params_uom_uom())
        pos_config = self._get_pos_ui_pos_config(self._loader_params_pos_config())
        pos_session = self._get_pos_ui_pos_session(self._loader_params_pos_session())
        res_company = self._get_pos_ui_res_company(self._loader_params_res_company())
        res_currency = self._get_pos_ui_res_currency(self._loader_params_res_currency())
        decimal_precision = self._get_pos_ui_decimal_precision(self._loader_params_decimal_precision())

        installed_version = '16.0'
        pos_mod = self.env['ir.module.module'].sudo().search_read([('name', '=', 'point_of_sale')], ['installed_version'])
        if pos_mod:
            installed_version = pos_mod[0].get('installed_version', '16.0')

        loaded_data = {
            'version': installed_version,
            'pos.session': pos_session,
            'pos.config': pos_config,
            'res.company': res_company,
            'res.currency': res_currency,
            'decimal.precision': decimal_precision,
            'uom.uom': uoms,
            'units_by_id': {u['id']: u for u in uoms},
            'res.country.state': [],
            'res.country': [],
            'res.lang': [],
            'account.tax': [],
            'taxes_by_id': {},
            'pos.bill': [],
            'res.partner': [],
            'stock.picking.type': [],
            'res.users': [{'id': self.user_id.id, 'name': self.user_id.name}],
            'product.pricelist': [],
            'default_pricelist': {},
            'pos.category': [],
            'pos_category': [],
            'product.product': [],
            'product.packaging': [],
            'attributes_by_ptal_id': {},
            'account.cash.rounding': [],
            'pos.payment.method': [],
            'account.fiscal.position': [],
            'base_url': self.get_base_url() if hasattr(self, 'get_base_url') else self.env['ir.config_parameter'].sudo().get_param('web.base.url'),
            'customer.display': customer_display,
            'ad.video': videos,

            # Compatibilidad con módulos instalados que extienden _processData en el frontend
            'account.move': [],
            'account.journal': [],
            'poscurrency': [],
            'product.template': [],
            'stock.warehouse': [],
            'stock.picking': [],
            'stock.location': [],
            'pos_sessions': [],
            'pos_order': [],
            'pos.order': [],
            'pos.loyalty.setting': [],
            'pos.redeem.rule': [],
            'users': [],
            'users1': [],
            'pos.gift.coupon': [],
            'product.barcode': [],
            'res.config.settings': [],
            'pos.receipt': [],
            'field_types': {},
            'product_id_to_program_ids': {},
            'loyalty.reward': [],
            'loyalty.program': [],
            'loyalty.rule': [],
            'restaurant.floor': [],
            'restaurant.printer': [],
            'hr.employee': [],
            'employee_by_id': {},
        }
        return loaded_data

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4: