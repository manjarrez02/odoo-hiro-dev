# -*- coding: utf-8 -*-
import logging
from odoo import models, api
from odoo.addons.loyalty.models.loyalty_program import LoyaltyProgram as CoreLoyaltyProgram

_logger = logging.getLogger(__name__)


class LoyaltyProgram(models.Model):
    _inherit = 'loyalty.program'

    def toggle_active(self):
        """
        Sobrescribe toggle_active para archivar y desarchivar promociones de manera segura:
        1. Pre-genera cualquier producto técnico de descuento faltante antes de cambiar estado.
        2. Omite la propagación defectuosa de Odoo Core (línea 402) que intenta archivar
           productos de descuento compartidos o productos comerciales sin control de dependencias.
        3. Propaga el estado a reglas, planes de comunicación y recompensas de forma segura
           usando contexto de omisión de validaciones circulares (skip_loyalty_product_check).
        4. Asegura la sincronización completa del archivado tanto en product.product como en product.template.
        """
        for program in self:
            for reward in program.reward_ids:
                if not reward.discount_line_product_id and reward.reward_type == 'discount':
                    _logger.info(
                        "Loyalty Safety: Pre-generando producto de descuento faltante para programa '%s' (Recompensa ID: %s)",
                        program.name, reward.id
                    )
                    reward._create_missing_discount_line_products()

        # Ejecutar toggle_active en models.Model (saltando CoreLoyaltyProgram para controlar la cascada)
        res = super(CoreLoyaltyProgram, self).toggle_active()

        for program in self.with_context(active_test=False):
            # Propagar a reglas y planes de comunicación
            program.rule_ids.active = program.active
            program.communication_plan_ids.active = program.active

            # Propagar a recompensas con contexto de seguridad
            program.reward_ids.with_context(
                skip_loyalty_product_check=True,
                from_loyalty_propagation=True
            ).write({'active': program.active})

            # Si se archivó la promoción, ejecutar barrido preventivo de productos auxiliares asociados
            if not program.active:
                program._cleanup_archived_programs_auxiliary_products()

        return res

    @api.model
    def _register_hook(self):
        """
        Al iniciar Odoo o recargar el registro, ejecuta una limpieza preventiva:
        Archiva tanto product.template como product.product de cualquier producto auxiliar técnico
        ("Descripción en la orden" / "Producto gratis" / "DISC_") cuyo programa ya se encuentre archivado.
        """
        res = super(LoyaltyProgram, self)._register_hook()
        try:
            self._cleanup_archived_programs_auxiliary_products()
        except Exception as e:
            _logger.warning("Loyalty Safety: Excepción en limpieza inicial de productos auxiliares: %s", e)
        return res

    @api.model
    def _cleanup_archived_programs_auxiliary_products(self):
        """
        Localiza y desactiva las plantillas (product.template) y variantes (product.product)
        de productos auxiliares de descuento/regalo que pertenezcan a promociones archivadas.
        """
        inactive_programs = self.with_context(active_test=False).sudo().search([('active', '=', False)])
        if not inactive_programs:
            return

        inactive_rewards = self.env['loyalty.reward'].with_context(active_test=False).sudo().search([
            ('program_id', 'in', inactive_programs.ids)
        ])

        templates_to_archive = self.env['product.template']

        # 1. Recorrer recompensas inactivas y recolectar sus productos asociados
        for reward in inactive_rewards:
            # A) Producto vinculado como discount_line_product_id
            disc_prod = reward.discount_line_product_id
            if disc_prod and disc_prod.type != 'product':
                if disc_prod.product_tmpl_id.active or disc_prod.active:
                    templates_to_archive |= disc_prod.product_tmpl_id

            # B) Plantillas cuyo nombre coincide con la "Descripción en la orden"
            if reward.description:
                matching_templates = self.env['product.template'].with_context(active_test=False).sudo().search([
                    ('name', '=', reward.description),
                    ('type', '!=', 'product'),
                    ('active', '=', True),
                ])
                templates_to_archive |= matching_templates

        # 2. Plantillas auxiliares con código técnico DISC_ pertenecientes a recompensas
        disc_templates = self.env['product.template'].with_context(active_test=False).sudo().search([
            ('default_code', '=like', 'DISC_%'),
            ('type', '!=', 'product'),
            ('active', '=', True),
        ])
        for tmpl in disc_templates:
            rew_id_str = tmpl.default_code.replace('DISC_', '') if tmpl.default_code else ''
            if rew_id_str.isdigit():
                rew = self.env['loyalty.reward'].with_context(active_test=False).sudo().browse(int(rew_id_str))
                if rew.exists() and (not rew.active or not rew.program_id.active):
                    templates_to_archive |= tmpl

        # 3. Plantillas con denominación "Producto gratis" o similar no almacenables
        free_templates = self.env['product.template'].with_context(active_test=False).sudo().search([
            ('name', 'ilike', 'Producto gratis'),
            ('type', '!=', 'product'),
            ('active', '=', True),
        ])
        for tmpl in free_templates:
            # Solo si no es un producto físico almacenable y no está en uso por programas activos
            templates_to_archive |= tmpl

        # 4. Desactivar de forma segura únicamente aquellas que NO estén en uso por programas activos
        for tmpl in templates_to_archive:
            if tmpl.type == 'product':
                # Salvaguarda absoluta para stock e inventario
                continue

            in_use_count = self.env['loyalty.reward'].sudo().search_count([
                ('discount_line_product_id.product_tmpl_id', '=', tmpl.id),
                ('active', '=', True),
                ('program_id.active', '=', True),
            ])
            if in_use_count == 0:
                _logger.info(
                    "Loyalty Safety: Archivando plantilla y variantes de producto auxiliar huérfano: '%s' (ID Template: %s)",
                    tmpl.display_name, tmpl.id
                )
                tmpl.with_context(skip_loyalty_product_check=True).sudo().write({'active': False})
                tmpl.with_context(active_test=False).product_variant_ids.with_context(skip_loyalty_product_check=True).sudo().write({'active': False})


class LoyaltyRule(models.Model):
    _inherit = 'loyalty.rule'

    def copy(self, default=None):
        default = dict(default or {})
        # Evitar fallo nativo de Odoo Core por restricción de unicidad al duplicar promociones con código promocional
        if self.mode == 'with_code' and self.code and 'code' not in default:
            default['code'] = f"{self.code}_copia"
        return super(LoyaltyRule, self).copy(default)

