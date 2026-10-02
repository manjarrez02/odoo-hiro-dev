# -*- coding: utf-8 -*-
from odoo import _, api, fields, models

class LoyaltyProgramConflictWizard(models.TransientModel):
    _name = 'loyalty.program.conflict.wizard'
    _description = 'Auditor Preventivo de Conflictos de Promociones'

    program_id = fields.Many2one(
        'loyalty.program',
        string='Filtrar por Programa',
        help="Dejar vacío para auditar todos los programas activos simultáneamente."
    )
    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        default=lambda self: self.env.company
    )
    conflict_line_ids = fields.One2many(
        'loyalty.program.conflict.line',
        'wizard_id',
        string='Conflictos Detectados'
    )

    total_programs_audited = fields.Integer(
        string='Programas Auditados',
        default=0
    )
    total_conflicts = fields.Integer(
        string='Total Conflictos',
        compute='_compute_stats'
    )
    critical_conflicts = fields.Integer(
        string='Conflictos Críticos (Peligro)',
        compute='_compute_stats'
    )
    warning_conflicts = fields.Integer(
        string='Advertencias',
        compute='_compute_stats'
    )
    info_conflicts = fields.Integer(
        string='Informativos',
        compute='_compute_stats'
    )
    status_message = fields.Char(
        string='Diagnóstico General',
        compute='_compute_stats'
    )

    @api.depends('conflict_line_ids', 'conflict_line_ids.severity')
    def _compute_stats(self):
        for wiz in self:
            lines = wiz.conflict_line_ids
            wiz.total_conflicts = len(lines)
            wiz.critical_conflicts = len(lines.filtered(lambda l: l.severity == 'danger'))
            wiz.warning_conflicts = len(lines.filtered(lambda l: l.severity == 'warning'))
            wiz.info_conflicts = len(lines.filtered(lambda l: l.severity == 'info'))
            if wiz.critical_conflicts > 0:
                wiz.status_message = _("¡Atención! Se detectaron %d colisiones críticas con alto riesgo financiero o de acumulación indebida.") % wiz.critical_conflicts
            elif wiz.warning_conflicts > 0:
                wiz.status_message = _("Se detectaron %d advertencias de configuración que requieren revisión preventiva.") % wiz.warning_conflicts
            elif wiz.info_conflicts > 0:
                wiz.status_message = _("Configuración armónica: Se detectaron %d interacciones controladas por exclusividad.") % wiz.info_conflicts
            else:
                wiz.status_message = _("Diagnóstico óptimo: No se detectaron conflictos entre promociones activas.")

    @api.onchange('program_id')
    def _onchange_program_id(self):
        self.action_scan_conflicts()

    def default_get(self, fields_list):
        res = super().default_get(fields_list)
        return res

    def action_scan_conflicts(self):
        self.ensure_one()
        self.conflict_line_ids.unlink()

        domain = [('active', '=', True)]
        if self.company_id:
            domain.append(('company_id', 'in', (self.company_id.id, False)))

        programs = self.env['loyalty.program'].search(domain, order='sequence asc, id asc')
        self.total_programs_audited = len(programs)

        conflict_lines_vals = []

        # 1. Auditoría Financiera de Margen / Venta Bajo Costo (Mecanismo 3 Modificado)
        audited_for_margins = [self.program_id] if self.program_id else programs
        for prog in audited_for_margins:
            if prog.prevent_below_cost and not prog.allow_loss_leader:
                deficits = prog._evaluate_margin_deficits()
                if deficits:
                    worst = sorted(deficits, key=lambda d: d['loss'], reverse=True)
                    summary = ", ".join([d['name'] for d in worst[:3]])
                    if len(deficits) > 3:
                        summary += _(" ... (+%d más)") % (len(deficits) - 3)

                    desc = _(
                        "Venta Bajo Costo Detectada: La promoción '%(name)s' genera pérdidas en %(count)d producto(s). "
                        "El precio de oferta no cubre el costo estándar de adquisición más el margen de seguridad. "
                        "Mayor déficit: [%(sku)s] %(prod)s (-$%(loss).2f).",
                        name=prog.name, count=len(deficits), sku=worst[0]['code'] or 'SKU',
                        prod=worst[0]['name'], loss=worst[0]['loss']
                    )
                    conflict_lines_vals.append({
                        'wizard_id': self.id,
                        'program_id': prog.id,
                        'conflict_program_id': False,
                        'conflict_type': 'below_cost',
                        'severity': 'danger',
                        'description': desc,
                        'product_count': len(deficits),
                        'products_summary': summary,
                    })

        # 2. Auditoría de Colisiones de Catálogo y Stacking entre Pares (Mecanismos 1 y 2)
        pairs = []
        if len(programs) >= 2:
            if self.program_id:
                pairs = [(self.program_id, p) for p in programs if p != self.program_id]
            else:
                prog_list = list(programs)
                pairs = [(prog_list[i], prog_list[j]) for i in range(len(prog_list)) for j in range(i + 1, len(prog_list))]

        def get_program_targets(prog):
            is_global = any(r.discount_applicability == 'order' for r in prog.reward_ids)
            any_product = any(rule.any_product for rule in prog.rule_ids)
            rule_prods = prog.rule_ids.mapped('product_ids')
            reward_prods = prog.reward_ids.mapped('discount_product_ids') | prog.reward_ids.mapped('trigger_product_ids')
            prods = rule_prods | reward_prods
            cats = prog.rule_ids.mapped('product_category_id') | prog.reward_ids.mapped('discount_product_category_id')
            if cats and not prods:
                prods = self.env['product.product'].search([('categ_id', 'child_of', cats.ids)])
            return is_global, any_product, prods, cats

        for p1, p2 in pairs:
            # 1. Filtro de listas de precios disjuntas
            if p1.pricelist_ids and p2.pricelist_ids and not (p1.pricelist_ids & p2.pricelist_ids):
                continue

            # 2. Filtro de vigencias de fechas disjuntas y vencidas
            today = fields.Date.context_today(self)
            if (p1.date_to and p1.date_to < today) or (p2.date_to and p2.date_to < today):
                continue

            p1_from = getattr(p1, 'date_from', False)
            p2_from = getattr(p2, 'date_from', False)
            if (p1.date_to and p2_from and p1.date_to < p2_from) or \
               (p2.date_to and p1_from and p2.date_to < p1_from):
                continue

            # 3. Filtro de compañías disjuntas
            if p1.company_id and p2.company_id and p1.company_id != p2.company_id:
                continue

            g1, any1, prod1, cat1 = get_program_targets(p1)
            g2, any2, prod2, cat2 = get_program_targets(p2)

            common_prods = prod1 & prod2
            common_cats = cat1 & cat2

            has_collision = g1 or g2 or any1 or any2 or bool(common_prods) or bool(common_cats)
            if not has_collision:
                continue

            # Clasificación de conflicto
            severity = 'warning'
            conflict_type = 'category_overlap'
            description = ""

            p1_is_bundle = p1.program_type == 'bundle_pricing' or any(r.discount_mode == 'per_block' for r in p1.reward_ids)
            p2_is_bundle = p2.program_type == 'bundle_pricing' or any(r.discount_mode == 'per_block' for r in p2.reward_ids)

            # Caso 1: Stacking crítico automático sin exclusividad
            if p1.trigger == 'auto' and p2.trigger == 'auto' and not p1.is_exclusive and not p2.is_exclusive:
                if p1_is_bundle or p2_is_bundle:
                    severity = 'danger'
                    conflict_type = 'bundle_overlap'
                    description = _(
                        "Colisión Crítica Paquete y Descuento: '%(p1)s' y '%(p2)s' son automáticas y no tienen exclusividad. "
                        "El cliente recibirá el beneficio del paquete cerrado y simultáneamente el descuento de lista, duplicando el sacrificio de margen.",
                        p1=p1.name, p2=p2.name
                    )
                else:
                    severity = 'danger'
                    conflict_type = 'stacking'
                    description = _(
                        "Riesgo de Acumulación Indebida (Stacking): '%(p1)s' y '%(p2)s' se aplican simultáneamente sobre el mismo catálogo "
                        "sin regla de exclusividad, sumando descuentos en cascada de forma no planificada.",
                        p1=p1.name, p2=p2.name
                    )
            # Caso 2: Conflicto de prioridad indeterminada (uno o ambos son exclusivos pero misma secuencia)
            elif (p1.is_exclusive or p2.is_exclusive) and p1.sequence == p2.sequence:
                severity = 'warning'
                conflict_type = 'priority'
                description = _(
                    "Prioridad Indeterminada: Existen promociones exclusivas con la misma prioridad (%(seq)s). "
                    "El orden de descarte dependerá arbitrariamente del ID de la base de datos.",
                    seq=p1.sequence
                )
            # Caso 3: Supresión controlada por exclusividad (uno es exclusivo y secuencias distintas)
            elif (p1.is_exclusive or p2.is_exclusive) and p1.sequence != p2.sequence:
                high = p1 if p1.sequence < p2.sequence else p2
                low = p2 if p1.sequence < p2.sequence else p1
                severity = 'info'
                conflict_type = 'suppression'
                description = _(
                    "Supresión por Exclusividad Controlada: '%(high)s' (Prioridad %(h_seq)s) tiene precedencia sobre '%(low)s' (Prioridad %(l_seq)s). "
                    "Al activarse la primera, la segunda será bloqueada sin acumular descuentos.",
                    high=high.name, h_seq=high.sequence, low=low.name, l_seq=low.sequence
                )
            else:
                severity = 'warning'
                conflict_type = 'category_overlap'
                description = _(
                    "Solapamiento de Catálogo: Ambas promociones coinciden en productos o categorías de venta.",
                )

            count = len(common_prods) if common_prods else (len(prod1 | prod2) if (g1 or g2 or any1 or any2) else 0)
            if common_prods:
                summary = ", ".join(common_prods[:4].mapped('name'))
                if len(common_prods) > 4:
                    summary += _(" ... (+%d productos más)") % (len(common_prods) - 4)
            elif common_cats:
                summary = _("Categorías: %s") % ", ".join(common_cats.mapped('name'))
            elif g1 or g2:
                summary = _("Descuento Global en toda la orden")
            else:
                summary = _("Catálogo general")

            conflict_lines_vals.append({
                'wizard_id': self.id,
                'program_id': p1.id,
                'conflict_program_id': p2.id,
                'conflict_type': conflict_type,
                'severity': severity,
                'description': description,
                'product_count': count,
                'products_summary': summary,
            })

        if conflict_lines_vals:
            self.env['loyalty.program.conflict.line'].create(conflict_lines_vals)

        return {
            'name': _('Auditor de Conflictos de Promociones'),
            'type': 'ir.actions.act_window',
            'res_model': 'loyalty.program.conflict.wizard',
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }


class LoyaltyProgramConflictLine(models.TransientModel):
    _name = 'loyalty.program.conflict.line'
    _description = 'Línea de Conflicto de Promoción'
    _order = 'severity desc, id asc'

    wizard_id = fields.Many2one('loyalty.program.conflict.wizard', ondelete='cascade')
    program_id = fields.Many2one('loyalty.program', string='Programa A', required=True)
    conflict_program_id = fields.Many2one('loyalty.program', string='Programa B', required=False)

    conflict_type = fields.Selection([
        ('stacking', 'Acumulación Indebida (Stacking)'),
        ('bundle_overlap', 'Colisión Paquete y Descuento'),
        ('below_cost', 'Venta Bajo Costo / Déficit de Margen'),
        ('priority', 'Prioridad Indeterminada'),
        ('suppression', 'Supresión por Exclusividad'),
        ('category_overlap', 'Coincidencia de Catálogo'),
    ], string='Tipo de Conflicto', required=True)

    severity = fields.Selection([
        ('danger', 'Crítico / Peligro'),
        ('warning', 'Advertencia'),
        ('info', 'Informativo'),
    ], string='Severidad', required=True)

    description = fields.Text(string='Diagnóstico y Detalle')
    product_count = fields.Integer(string='Uds. Afectadas')
    products_summary = fields.Char(string='Productos / Alcance')

    def action_open_program_a(self):
        self.ensure_one()
        return {
            'name': self.program_id.name,
            'type': 'ir.actions.act_window',
            'res_model': 'loyalty.program',
            'res_id': self.program_id.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_open_program_b(self):
        self.ensure_one()
        if not self.conflict_program_id:
            return False
        return {
            'name': self.conflict_program_id.name,
            'type': 'ir.actions.act_window',
            'res_model': 'loyalty.program',
            'res_id': self.conflict_program_id.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_make_exclusive_a(self):
        self.ensure_one()
        self.program_id.is_exclusive = True
        return self.wizard_id.action_scan_conflicts()
