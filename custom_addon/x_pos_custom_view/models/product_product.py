# -*- coding: utf-8 -*-
import logging
from odoo import models, api, _
from odoo.exceptions import ValidationError
from odoo.addons.loyalty.models.product_product import ProductProduct as CoreProductProduct

_logger = logging.getLogger(__name__)


class ProductProduct(models.Model):
    _inherit = 'product.product'

    def write(self, vals):
        if not vals.get('active', True):
            # 1. Si viene con bandera explícita de omisión (por ejemplo desde archivado de programa/recompensa)
            if self.env.context.get('skip_loyalty_product_check'):
                res = super(CoreProductProduct, self).write(vals)
                # Si se desactiva un producto auxiliar (servicio), archivar también su plantilla para que no aparezca en vistas
                for prod in self:
                    if prod.type != 'product' and prod.product_tmpl_id.active:
                        other_active_variants = self.search_count([
                            ('product_tmpl_id', '=', prod.product_tmpl_id.id),
                            ('active', '=', True),
                            ('id', '!=', prod.id),
                        ])
                        if other_active_variants == 0:
                            prod.product_tmpl_id.with_context(skip_loyalty_product_check=True).sudo().write({'active': False})
                return res

            # 2. Si se intenta archivar un producto por propagación de lealtad:
            # Proteger ÚNICAMENTE productos almacenables con control de inventario (type == 'product')
            # para evitar bloqueos en traslados de stock, permitiendo archivar servicios y productos auxiliares.
            if self.env.context.get('from_loyalty_propagation'):
                storable_stock = self.filtered(lambda p: p.type == 'product')
                if storable_stock:
                    _logger.info(
                        "Loyalty Safety: Protegiendo productos almacenables de inventario contra desactivación: %s",
                        storable_stock.mapped('display_name')
                    )
                    non_storable = self - storable_stock
                    if non_storable:
                        return super(CoreProductProduct, non_storable).write(vals)
                    return True

            # 3. Validación inteligente para archivado manual desde la interfaz de usuario:
            # Solo bloquear si el producto es usado por una recompensa de un programa que REALMENTE esté activo
            active_rewards = self.env['loyalty.reward'].sudo().search([
                ('discount_line_product_id', 'in', self.ids),
                ('active', '=', True),
                ('program_id.active', '=', True),
            ], limit=1)

            if active_rewards:
                raise ValidationError(
                    _("Este producto no se puede archivar ya que se está usando para un programa de ofertas activo.")
                )

            # Si ninguna promoción activa real lo utiliza, permitir el archivado seguro
            return super(CoreProductProduct, self).write(vals)

        elif vals.get('active'):
            # Si se reactiva un producto auxiliar, reactivar también su plantilla correspondiente
            res = super(ProductProduct, self).write(vals)
            for prod in self:
                if prod.product_tmpl_id and not prod.product_tmpl_id.active:
                    prod.product_tmpl_id.with_context(skip_loyalty_product_check=True).sudo().write({'active': True})
            return res

        return super(ProductProduct, self).write(vals)
