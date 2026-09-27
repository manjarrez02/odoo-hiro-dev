# -*- coding: utf-8 -*-
from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

class LoyaltyProgram(models.Model):
    _inherit = 'loyalty.program'

    program_type = fields.Selection(
        selection_add=[('bundle_pricing', 'Compra X por $Y (Paquetes)')],
        ondelete={'bundle_pricing': 'set default'}
    )

    pricelist_ids = fields.Many2many(
        'product.pricelist',
        'loyalty_program_pricelist_rel',
        'program_id',
        'pricelist_id',
        string='Listas de Precios Aplicables',
        help="Si se especifican, la promoción solo aplicará cuando el pedido use una de estas listas de precios. Dejar vacío para permitir en todas las tarifas."
    )

    is_exclusive = fields.Boolean(
        string='Promoción Exclusiva (No Acumulable)',
        default=False,
        help="Si está marcado, esta promoción no se acumulará con otras promociones de descuento sobre los mismos productos o en el pedido."
    )

    sequence = fields.Integer(
        string='Prioridad de Evaluación',
        default=10,
        help="Menor número = mayor prioridad de aplicación. Las promociones con menor secuencia se evalúan y aplican primero."
    )

    prevent_below_cost = fields.Boolean(
        string='Proteger Precio de Costo (Piso Preventivo)',
        default=True,
        help="Al activar o guardar la promoción, el sistema valida preventivamente en Backoffice que ningún producto elegible se venda por debajo del costo estándar más el margen de seguridad."
    )

    min_margin_pc = fields.Float(
        string='Margen Mínimo de Seguridad (%)',
        default=0.0,
        help="Margen porcentual mínimo a garantizar sobre el costo del producto (ej. 5% = costo * 1.05)."
    )

    allow_loss_leader = fields.Boolean(
        string='Autorizar Venta a Pérdida (Producto Gancho / Excepción)',
        default=False,
        help="Permite la activación de una promoción con margen negativo cuando responde a una decisión comercial deliberada (ej. liquidación o producto gancho)."
    )

    loss_leader_reason = fields.Text(
        string='Justificación de Venta a Pérdida',
        help="Explique el motivo comercial o estratégico por el cual se autoriza la venta por debajo del costo."
    )

    loss_leader_approval_user_id = fields.Many2one(
        'res.users',
        string='Aprobado por',
        default=lambda self: self.env.user,
        help="Usuario que autoriza la excepción de venta bajo costo."
    )

    def _evaluate_margin_deficits(self):
        """
        Evalúa si la promoción produce ventas por debajo del costo estándar (standard_price)
        más el margen mínimo de seguridad en cualquiera de los productos configurados.
        Retorna una lista de diccionarios con el detalle de los productos en déficit.
        """
        self.ensure_one()
        if not self.prevent_below_cost or self.allow_loss_leader:
            return []

        margin_factor = 1.0 + ((self.min_margin_pc or 0.0) / 100.0)
        deficits = []

        rule_prods = self.rule_ids.mapped('product_ids')
        rule_cats = self.rule_ids.mapped('product_category_id')
        if rule_cats and not rule_prods:
            rule_prods = self.env['product.product'].search([
                ('categ_id', 'child_of', rule_cats.ids),
                ('sale_ok', '=', True)
            ])

        for reward in self.reward_ids:
            if reward.reward_type != 'discount':
                continue

            # Caso 1: per_block (bundle_pricing)
            if reward.discount_mode == 'per_block':
                target_prods = reward.discount_product_ids or rule_prods
                if not target_prods and reward.discount_product_category_id:
                    target_prods = self.env['product.product'].search([
                        ('categ_id', 'child_of', reward.discount_product_category_id.id),
                        ('sale_ok', '=', True)
                    ])

                b_qty = reward.bundle_qty or 1
                b_price = reward.bundle_price or 0.0

                if reward.bundle_pricing_mode == 'target_price':
                    for p in target_prods:
                        if p.standard_price <= 0:
                            continue
                        cost_floor = (p.standard_price * b_qty) * margin_factor
                        if b_price < cost_floor and cost_floor > 0:
                            loss = cost_floor - b_price
                            loss_pc = (loss / cost_floor) * 100.0 if cost_floor else 0.0
                            deficits.append({
                                'product': p,
                                'code': p.default_code or '',
                                'name': p.name,
                                'cost': cost_floor,
                                'promo_price': b_price,
                                'loss': loss,
                                'loss_pc': loss_pc,
                                'reason': _("Paquete de %(qty)s uds a $%(price).2f (Costo mínimo: $%(cost).2f)",
                                            qty=b_qty, price=b_price, cost=cost_floor)
                            })
                elif reward.bundle_pricing_mode == 'fixed_discount':
                    disc = reward.discount or 0.0
                    for p in target_prods:
                        if p.standard_price <= 0:
                            continue
                        normal_price = p.list_price * b_qty
                        promo_price = max(0.0, normal_price - disc)
                        cost_floor = (p.standard_price * b_qty) * margin_factor
                        if promo_price < cost_floor and cost_floor > 0:
                            loss = cost_floor - promo_price
                            loss_pc = (loss / cost_floor) * 100.0 if cost_floor else 0.0
                            deficits.append({
                                'product': p,
                                'code': p.default_code or '',
                                'name': p.name,
                                'cost': cost_floor,
                                'promo_price': promo_price,
                                'loss': loss,
                                'loss_pc': loss_pc,
                                'reason': _("Descuento fijo de $%(disc).2f en paquete de %(qty)s uds (Precio: $%(price).2f vs Costo mínimo: $%(cost).2f)",
                                            disc=disc, qty=b_qty, price=promo_price, cost=cost_floor)
                            })
                elif reward.bundle_pricing_mode == 'free_units':
                    free = reward.free_qty or 1
                    pay_qty = max(0, b_qty - free)
                    for p in target_prods:
                        if p.standard_price <= 0:
                            continue
                        rev = pay_qty * p.list_price
                        cost_floor = (p.standard_price * b_qty) * margin_factor
                        if rev < cost_floor and cost_floor > 0:
                            loss = cost_floor - rev
                            loss_pc = (loss / cost_floor) * 100.0 if cost_floor else 0.0
                            deficits.append({
                                'product': p,
                                'code': p.default_code or '',
                                'name': p.name,
                                'cost': cost_floor,
                                'promo_price': rev,
                                'loss': loss,
                                'loss_pc': loss_pc,
                                'reason': _("Promoción %(total)sx%(pay)s (Ingreso: $%(rev).2f vs Costo total: $%(cost).2f)",
                                            total=b_qty, pay=pay_qty, rev=rev, cost=cost_floor)
                            })
                elif reward.bundle_pricing_mode == 'cross_product_free':
                    trigger_prods = reward.trigger_product_ids or rule_prods
                    reward_prods = reward.discount_product_ids
                    free = reward.free_qty or 1
                    for tx in trigger_prods:
                        rev = b_qty * tx.list_price
                        for ry in reward_prods:
                            cost_total = ((b_qty * tx.standard_price) + (free * ry.standard_price)) * margin_factor
                            if rev < cost_total and cost_total > 0:
                                loss = cost_total - rev
                                loss_pc = (loss / cost_total) * 100.0 if cost_total else 0.0
                                deficits.append({
                                    'product': ry,
                                    'code': ry.default_code or '',
                                    'name': _("%(x)s + Regalo %(y)s", x=tx.name, y=ry.name),
                                    'cost': cost_total,
                                    'promo_price': rev,
                                    'loss': loss,
                                    'loss_pc': loss_pc,
                                    'reason': _("Compra %(bx)s de [%(x)s] y recibe %(by)s gratis de [%(y)s] (Ingreso: $%(rev).2f vs Costo combinado: $%(cost).2f)",
                                                bx=b_qty, x=tx.name, by=free, y=ry.name, rev=rev, cost=cost_total)
                                })

            # Caso 2: Porcentaje de descuento estándar
            elif reward.discount_mode == 'percent' and reward.discount > 0:
                disc_pct = reward.discount / 100.0
                target_prods = reward.discount_product_ids or rule_prods
                if not target_prods and reward.discount_product_category_id:
                    target_prods = self.env['product.product'].search([
                        ('categ_id', 'child_of', reward.discount_product_category_id.id),
                        ('sale_ok', '=', True)
                    ])
                for p in target_prods:
                    if p.list_price <= 0 or p.standard_price <= 0:
                        continue
                    net_price = p.list_price * (1.0 - disc_pct)
                    cost_floor = p.standard_price * margin_factor
                    if net_price < cost_floor and cost_floor > 0:
                        loss = cost_floor - net_price
                        loss_pc = (loss / cost_floor) * 100.0 if cost_floor else 0.0
                        deficits.append({
                            'product': p,
                            'code': p.default_code or '',
                            'name': p.name,
                            'cost': cost_floor,
                            'promo_price': net_price,
                            'loss': loss,
                            'loss_pc': loss_pc,
                            'reason': _("Descuento %(pct).1f%% sobre PVP $%(pv).2f da $%(net).2f (Costo mínimo: $%(cost).2f)",
                                        pct=reward.discount, pv=p.list_price, net=net_price, cost=cost_floor)
                        })

        return deficits

    @api.constrains('active', 'prevent_below_cost', 'min_margin_pc', 'allow_loss_leader', 'reward_ids', 'rule_ids')
    def _check_margin_safety_on_activation(self):
        for program in self:
            if not program.active or not program.prevent_below_cost or program.allow_loss_leader:
                continue
            deficits = program._evaluate_margin_deficits()
            if deficits:
                details = "\n".join([
                    f"• [{d['code'] or 'SKU'}] {d['name']}: {d['reason']} | Déficit: -${d['loss']:.2f} (-{d['loss_pc']:.1f}%)"
                    for d in deficits[:5]
                ])
                if len(deficits) > 5:
                    details += f"\n• ... y {len(deficits) - 5} productos más en pérdida."

                raise ValidationError(_(
                    "¡Bloqueo Preventivo de Margen / Venta Bajo Costo!\n\n"
                    "La promoción '%(name)s' no puede activarse ni guardarse con productos en déficit financiero:\n\n"
                    "%(details)s\n\n"
                    "Acciones posibles:\n"
                    "1. Ajuste el precio del paquete o porcentaje de descuento para cubrir los costos.\n"
                    "2. Excluya los productos con alto costo de la promoción.\n"
                    "3. Si es una decisión comercial deliberada (ej. Producto Gancho o Liquidación), marque la casilla 'Autorizar Venta a Pérdida' e indique la justificación comercial."
                ) % {'name': program.name, 'details': details})

    @api.constrains('allow_loss_leader', 'loss_leader_reason')
    def _check_loss_leader_reason(self):
        for program in self:
            if program.allow_loss_leader and not (program.loss_leader_reason and program.loss_leader_reason.strip()):
                raise ValidationError(_("Debe especificar la Justificación Comercial de la Venta a Pérdida al autorizar una promoción como Producto Gancho / Remate."))

    def action_open_conflict_wizard(self):
        self.ensure_one()
        wizard = self.env['loyalty.program.conflict.wizard'].create({
            'program_id': self.id,
        })
        wizard.action_scan_conflicts()
        return {
            'name': _('Auditor de Conflictos de Promoción'),
            'type': 'ir.actions.act_window',
            'res_model': 'loyalty.program.conflict.wizard',
            'res_id': wizard.id,
            'view_mode': 'form',
            'target': 'new',
        }

    @api.model
    def _program_items_name(self):
        res = super()._program_items_name()
        res['bundle_pricing'] = _('Promos')
        return res

    @api.depends('coupon_count', 'program_type')
    def _compute_coupon_count_display(self):
        program_items_name = self._program_items_name()
        for program in self:
            item_name = program_items_name.get(program.program_type, _('Promos'))
            program.coupon_count_display = "%i %s" % (program.coupon_count or 0, item_name or '')

    @api.model
    def _template_values(self):
        res = super()._template_values()
        defaults = self._program_type_default_values()
        if 'bundle_pricing' in defaults:
            res['bundle_pricing'] = {
                'name': _('Promoción Compra X por $Y'),
                'program_type': 'bundle_pricing',
                **defaults['bundle_pricing']
            }
        return res

    def _program_type_default_values(self):
        res = super()._program_type_default_values()
        first_sale_product = self.env['product.product'].search([('sale_ok', '=', True)], limit=1)
        default_bundle_price = max(50.0, (first_sale_product.standard_price * 3.0 * 1.2)) if first_sale_product else 50.0
        res['bundle_pricing'] = {
            'applies_on': 'current',
            'trigger': 'auto',
            'portal_visible': False,
            'portal_point_name': _('Puntos'),
            'rule_ids': [(5, 0, 0), (0, 0, {
                'reward_point_mode': 'unit',
                'reward_point_amount': 1,
                'product_ids': first_sale_product,
                'minimum_qty': 3,
            })],
            'reward_ids': [(5, 0, 0), (0, 0, {
                'reward_type': 'discount',
                'discount_mode': 'per_block',
                'discount_applicability': 'specific',
                'discount_product_ids': first_sale_product,
                'discount': 10,
                'bundle_qty': 3,
                'bundle_price': default_bundle_price,
                'bundle_pricing_mode': 'target_price',
                'description': _('Promoción Compra X por $Y'),
                'required_points': 3,
            })],
            'communication_plan_ids': [(5, 0, 0)],
        }
        return res
