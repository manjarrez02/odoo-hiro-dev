# -*- coding: utf-8 -*-
import logging
from odoo import models, api, _
from odoo.addons.loyalty.models.loyalty_reward import LoyaltyReward as CoreLoyaltyReward

_logger = logging.getLogger(__name__)


class LoyaltyReward(models.Model):
    _inherit = 'loyalty.reward'

    def write(self, vals):
        if 'active' in vals:
            new_active = vals.get('active')

            if not new_active:
                for reward in self:
                    if not reward.discount_line_product_id and reward.reward_type == 'discount':
                        _logger.info(
                            "Loyalty Safety: Generando producto de descuento faltante para recompensa ID %s ('%s')",
                            reward.id, reward.description
                        )
                        reward._create_missing_discount_line_products()

            # Escribir vals que no sean 'active' usando la cadena normal
            vals_no_active = {k: v for k, v in vals.items() if k != 'active'}
            if vals_no_active:
                super(LoyaltyReward, self).write(vals_no_active)

            # Escribir 'active' en models.Model (saltando CoreLoyaltyReward para que NO archive reward_product_id comercial)
            super(CoreLoyaltyReward, self).write({'active': new_active})

            # Forzar flush del campo 'active' para que cualquier consulta SQL posterior vea el valor actualizado
            self.flush_recordset(['active'])

            # Gestión segura de productos vinculados:
            for reward in self:
                # A) Producto técnico auxiliar de descuento (discount_line_product_id o "Descripción en la orden")
                disc_prods = reward.discount_line_product_id
                if not disc_prods and reward.description:
                    disc_prods = self.env['product.product'].with_context(active_test=False).sudo().search([
                        ('name', '=', reward.description),
                        ('type', '!=', 'product'),
                    ])
                    if disc_prods:
                        reward.discount_line_product_id = disc_prods[0]

                if disc_prods:
                    for disc_prod in disc_prods:
                        # Nunca archivar productos almacenables con control de inventario
                        if disc_prod.type == 'product':
                            continue

                        if new_active:
                            disc_prod.with_context(skip_loyalty_product_check=True).sudo().write({'active': True})
                            disc_prod.product_tmpl_id.with_context(skip_loyalty_product_check=True).sudo().write({'active': True})
                        else:
                            # Solo archivar si ninguna OTRA promoción activa está usando este mismo producto
                            other_active = self.env['loyalty.reward'].sudo().search_count([
                                ('discount_line_product_id', '=', disc_prod.id),
                                ('active', '=', True),
                                ('program_id.active', '=', True),
                                ('id', '!=', reward.id)
                            ])
                            if other_active == 0:
                                _logger.info(
                                    "Loyalty Safety: Archivando producto y plantilla auxiliar de descuento '%s' de la recompensa ID %s",
                                    disc_prod.display_name, reward.id
                                )
                                disc_prod.with_context(skip_loyalty_product_check=True).sudo().write({'active': False})
                                disc_prod.product_tmpl_id.with_context(skip_loyalty_product_check=True).sudo().write({'active': False})
                            else:
                                _logger.info(
                                    "Loyalty Safety: Conservando activo producto de descuento '%s' porque está en uso por otra promoción activa.",
                                    disc_prod.display_name
                                )

                # B) Producto físico de recompensa (reward_product_id)
                rew_prod = reward.reward_product_id
                if rew_prod:
                    if rew_prod.type == 'product':
                        _logger.info(
                            "Loyalty Safety: Protegiendo producto almacenable de catálogo '%s' contra archivado involuntario.",
                            rew_prod.display_name
                        )
                        # Asegurar que permanezca activo siempre (evita bloqueos de inventario en traslados)
                        if not rew_prod.active:
                            rew_prod.with_context(skip_loyalty_product_check=True).sudo().write({'active': True})
                    else:
                        # Si es un producto no almacenable (servicio técnico auxiliar)
                        if new_active:
                            rew_prod.with_context(skip_loyalty_product_check=True).sudo().write({'active': True})
                            rew_prod.product_tmpl_id.with_context(skip_loyalty_product_check=True).sudo().write({'active': True})
                        else:
                            other_active = self.env['loyalty.reward'].sudo().search_count([
                                ('reward_product_id', '=', rew_prod.id),
                                ('active', '=', True),
                                ('program_id.active', '=', True),
                                ('id', '!=', reward.id)
                            ])
                            if other_active == 0:
                                rew_prod.with_context(skip_loyalty_product_check=True).sudo().write({'active': False})
                                rew_prod.product_tmpl_id.with_context(skip_loyalty_product_check=True).sudo().write({'active': False})

            return True

        return super(LoyaltyReward, self).write(vals)
