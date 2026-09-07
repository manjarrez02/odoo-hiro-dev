# -*- coding: utf-8 -*-
from odoo import models


class PosSession(models.Model):
    _inherit = 'pos.session'

    def _loader_params_product_product(self):
        result = super()._loader_params_product_product()
        fields = result.get('search_params', {}).get('fields', [])
        # Eliminamos 'image_128' de los campos solicitados al ORM
        # para evitar leer los binarios de imagen desde el disco/filestore.
        if 'image_128' in fields:
            fields.remove('image_128')
        return result

    def _process_pos_ui_product_product(self, products):
        """
        Idea 1: SQL Attachment Matcher.
        Asigna el indicador booleano `image_128` a cada producto mediante
        una consulta SQL indexada directa sobre `ir_attachment`, sin leer
        los datos binarios en memoria ni acceder al filestore.
        """
        if products:
            product_ids = set()
            tmpl_ids = set()
            for p in products:
                product_ids.add(p['id'])
                tmpl_id = p.get('product_tmpl_id')
                if isinstance(tmpl_id, (list, tuple)) and tmpl_id:
                    tmpl_ids.add(tmpl_id[0])
                elif isinstance(tmpl_id, int):
                    tmpl_ids.add(tmpl_id)

            tmpl_with_image = set()
            prod_with_image = set()

            if tmpl_ids or product_ids:
                query = """
                    SELECT res_model, res_id
                      FROM ir_attachment
                     WHERE res_field IN ('image_128', 'image_1920', 'image_variant_128', 'image_variant_1920')
                       AND (
                           (res_model = 'product.template' AND res_id IN %(tmpl_ids)s)
                           OR
                           (res_model = 'product.product' AND res_id IN %(prod_ids)s)
                       )
                """
                params = {
                    'tmpl_ids': tuple(tmpl_ids) if tmpl_ids else (0,),
                    'prod_ids': tuple(product_ids) if product_ids else (0,),
                }
                self.env.cr.execute(query, params)
                for res_model, res_id in self.env.cr.fetchall():
                    if res_model == 'product.template':
                        tmpl_with_image.add(res_id)
                    elif res_model == 'product.product':
                        prod_with_image.add(res_id)

            for product in products:
                tmpl_id = product.get('product_tmpl_id')
                t_id = tmpl_id[0] if isinstance(tmpl_id, (list, tuple)) and tmpl_id else tmpl_id
                product['image_128'] = bool(product['id'] in prod_with_image or t_id in tmpl_with_image)

        return super()._process_pos_ui_product_product(products)