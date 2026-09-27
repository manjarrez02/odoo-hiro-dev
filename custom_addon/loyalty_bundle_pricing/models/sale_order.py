# -*- coding: utf-8 -*-
from collections import defaultdict
import random
from odoo import _, api, fields, models
from odoo.fields import Command
from odoo.tools.float_utils import float_is_zero

def _generate_random_reward_code():
    return str(random.getrandbits(32))

class SaleOrder(models.Model):
    _inherit = 'sale.order'

    has_unapplied_promotions = fields.Boolean(
        string="Promociones disponibles no aplicadas",
        compute="_compute_has_unapplied_promotions",
        store=True,
        copy=False,
    )
    promo_dismissed = fields.Boolean(
        string="Promociones descartadas por el usuario",
        default=False,
        copy=False,
    )

    @api.depends(
        'order_line.product_uom_qty',
        'order_line.product_id',
        'order_line.price_unit',
        'order_line.is_reward_line',
        'pricelist_id',
        'promo_dismissed',
        'state',
    )
    def _compute_has_unapplied_promotions(self):
        for order in self:
            order.has_unapplied_promotions = order._check_unapplied_promotions()

    def _get_reward_affected_products(self, reward):
        """Devuelve los productos involucrados en la recompensa para verificar colisiones."""
        if not reward:
            return self.env['product.product']
        if reward.discount_applicability == 'order':
            return self.order_line.filtered(lambda l: not l.is_reward_line and l.product_id).product_id
        products = self.env['product.product']
        if reward.discount_mode == 'per_block' and reward.bundle_pricing_mode == 'cross_product_free':
            if reward.trigger_product_ids:
                products |= reward.trigger_product_ids
            else:
                products |= reward.program_id.rule_ids.mapped('product_ids')
            if reward.discount_product_ids:
                products |= reward.discount_product_ids
            elif reward.all_discount_product_ids:
                products |= reward.all_discount_product_ids
            else:
                reward_domain = reward._get_discount_product_domain()
                if reward_domain:
                    products |= self.env['product.product'].search(reward_domain)
        else:
            reward_domain = reward._get_discount_product_domain()
            if reward_domain:
                products |= self.env['product.product'].search(reward_domain)
            elif reward.discount_product_ids:
                products |= reward.discount_product_ids
        return products

    def _check_unapplied_promotions(self):
        self.ensure_one()
        if self.state not in ('draft', 'sent') or self.promo_dismissed:
            return False

        order_lines = self.order_line.filtered(
            lambda l: l.product_id and not l.is_reward_line and l.product_uom_qty > 0
        )
        if not order_lines:
            return False

        programs = self.env['loyalty.program'].search([
            ('trigger', '=', 'auto'),
            ('active', '=', True),
            ('applies_on', 'in', ('current', 'both')),
        ], order='sequence asc, id asc')
        if self.pricelist_id:
            programs = programs.filtered(
                lambda p: not p.pricelist_ids or self.pricelist_id in p.pricelist_ids
            )
        if not programs:
            return False

        applied_reward_lines = self.order_line.filtered('is_reward_line')
        applied_reward_ids = applied_reward_lines.mapped('reward_id')
        applied_exclusive_rewards = applied_reward_lines.filtered(lambda l: l.reward_id.program_id.is_exclusive).mapped('reward_id')
        if any(r.discount_applicability == 'order' for r in applied_exclusive_rewards):
            return False

        exclusive_products_covered = self.env['product.product']
        for ex_r in applied_exclusive_rewards:
            exclusive_products_covered |= self._get_reward_affected_products(ex_r)

        # Evaluación pura de puntos en memoria sin escribir en BD (100% compatible con NewId)
        status = self._program_check_compute_points(programs)

        for program in programs:
            prog_status = status.get(program, {})
            if 'error' in prog_status or 'points' not in prog_status:
                continue
            points = prog_status['points'][0] if prog_status['points'] else 0
            for reward in program.reward_ids:
                if reward not in applied_reward_ids and points >= reward.required_points:
                    reward_products = self._get_reward_affected_products(reward)
                    if exclusive_products_covered and (reward.discount_applicability == 'order' or bool(reward_products & exclusive_products_covered)):
                        continue
                    if reward.program_id.is_exclusive and applied_reward_lines:
                        applied_prods = self.env['product.product']
                        for l in applied_reward_lines:
                            applied_prods |= self._get_reward_affected_products(l.reward_id)
                        if reward.discount_applicability == 'order' or bool(reward_products & applied_prods):
                            continue
                    if reward.discount_mode == 'per_block':
                        if reward._is_cross_product_free():
                            trigger_prods = reward.trigger_product_ids or reward.program_id.rule_ids.mapped('product_ids')
                            reward_prods = (reward.discount_product_ids or reward.all_discount_product_ids) - trigger_prods
                            has_reward_product = any(
                                l.product_id in reward_prods
                                for l in order_lines if reward_prods
                            )
                            if not has_reward_product:
                                continue
                        elif reward.bundle_pricing_mode == 'target_price' and reward.bundle_price > 0:
                            bundle_qty = reward.bundle_qty or 3
                            reward_domain = reward._get_discount_product_domain() if reward.discount_applicability == 'specific' else None
                            matching_lines = order_lines.filtered(
                                lambda l: l.product_id.filtered_domain(reward_domain) if reward_domain else True
                            )
                            total_qty = sum(matching_lines.mapped('product_uom_qty'))
                            complete_blocks = int(total_qty // bundle_qty)
                            if complete_blocks <= 0:
                                continue
                            promo_units = complete_blocks * bundle_qty
                            current_cost = 0.0
                            accum_qty = 0.0
                            for line in matching_lines.sorted(key=lambda l: l.price_reduce, reverse=True):
                                take = min(line.product_uom_qty, promo_units - accum_qty)
                                current_cost += line.price_reduce * take
                                accum_qty += take
                                if accum_qty >= promo_units:
                                    break
                            target_cost = complete_blocks * reward.bundle_price
                            if current_cost <= target_cost:
                                continue
                    return True
        return False

    def _get_claimable_rewards(self, forced_coupons=None):
        res = super()._get_claimable_rewards(forced_coupons=forced_coupons)
        applied_discount_lines = self.order_line.filtered(lambda l: l.is_reward_line and l.reward_id.reward_type == 'discount')
        applied_exclusive_rewards = applied_discount_lines.filtered(lambda l: l.reward_id.program_id.is_exclusive).mapped('reward_id')

        sorted_coupons = sorted(res.keys(), key=lambda c: (c.program_id.sequence, c.program_id.id))
        filtered_res = {}

        exclusive_products_covered = self.env['product.product']
        for ex_r in applied_exclusive_rewards:
            exclusive_products_covered |= self._get_reward_affected_products(ex_r)

        for coupon in sorted_coupons:
            rewards = res[coupon]
            valid_rewards = self.env['loyalty.reward']
            for reward in rewards.sorted(key=lambda r: (r.program_id.sequence, r.id)):
                if reward.reward_type != 'discount':
                    valid_rewards |= reward
                    continue

                if reward.discount_mode == 'per_block':
                    if any(l.is_reward_line and l.reward_id == reward for l in self.order_line):
                        continue
                    if reward._is_cross_product_free():
                        trigger_prods = reward.trigger_product_ids or reward.program_id.rule_ids.mapped('product_ids')
                        reward_prods = (reward.discount_product_ids or reward.all_discount_product_ids) - trigger_prods
                        has_reward_product = any(
                            not l.is_reward_line and l.product_uom_qty > 0 and (l.product_id in reward_prods)
                            for l in self.order_line if reward_prods
                        )
                        if not has_reward_product:
                            continue
                    elif reward.bundle_pricing_mode == 'target_price' and reward.bundle_price > 0:
                        bundle_qty = reward.bundle_qty or 3
                        reward_domain = reward._get_discount_product_domain() if reward.discount_applicability == 'specific' else None
                        matching_lines = self.order_line.filtered(
                            lambda l: not l.is_reward_line and l.product_uom_qty > 0 and (
                                l.product_id.filtered_domain(reward_domain) if reward_domain else True
                            )
                        )
                        total_qty = sum(matching_lines.mapped('product_uom_qty'))
                        complete_blocks = int(total_qty // bundle_qty)
                        if complete_blocks <= 0:
                            continue
                        promo_units = complete_blocks * bundle_qty
                        current_cost = 0.0
                        accum_qty = 0.0
                        for line in matching_lines.sorted(key=lambda l: l.price_reduce, reverse=True):
                            take = min(line.product_uom_qty, promo_units - accum_qty)
                            current_cost += line.price_reduce * take
                            accum_qty += take
                            if accum_qty >= promo_units:
                                break
                        target_cost = complete_blocks * reward.bundle_price
                        if current_cost <= target_cost:
                            continue

                # Control de Exclusividad
                reward_products = self._get_reward_affected_products(reward)
                if any(r.discount_applicability == 'order' for r in applied_exclusive_rewards):
                    continue
                if exclusive_products_covered and (reward.discount_applicability == 'order' or bool(reward_products & exclusive_products_covered)):
                    continue
                if reward.program_id.is_exclusive and applied_discount_lines:
                    applied_prods = self.env['product.product']
                    for l in applied_discount_lines:
                        applied_prods |= self._get_reward_affected_products(l.reward_id)
                    if reward.discount_applicability == 'order' or bool(reward_products & applied_prods):
                        continue

                valid_rewards |= reward

            if valid_rewards:
                filtered_res[coupon] = valid_rewards

        return filtered_res

    def _apply_program_reward(self, reward, coupon, **kwargs):
        self.ensure_one()
        if reward.reward_type == 'discount':
            applied_discount_lines = self.order_line.filtered(
                lambda l: l.is_reward_line and l.reward_id.reward_type == 'discount' and l.reward_id != reward
            )
            if reward.program_id.is_exclusive:
                if applied_discount_lines:
                    if reward.discount_applicability == 'order':
                        return {'error': _("La promoción '%s' es exclusiva y no puede acumularse con otros descuentos.", reward.program_id.name)}
                    reward_prods = self._get_reward_affected_products(reward)
                    for l in applied_discount_lines:
                        if l.reward_id.discount_applicability == 'order' or bool(reward_prods & self._get_reward_affected_products(l.reward_id)):
                            return {'error': _("La promoción '%s' es exclusiva y colisiona con el descuento '%s'.", reward.program_id.name, l.reward_id.description or l.name)}
            else:
                for l in applied_discount_lines.filtered(lambda x: x.reward_id.program_id.is_exclusive):
                    ex_reward = l.reward_id
                    if ex_reward.discount_applicability == 'order':
                        return {'error': _("No se puede aplicar '%s' porque ya existe una promoción exclusiva ('%s').", reward.program_id.name, ex_reward.program_id.name)}
                    ex_prods = self._get_reward_affected_products(ex_reward)
                    reward_prods = self._get_reward_affected_products(reward)
                    if reward.discount_applicability == 'order' or bool(ex_prods & reward_prods):
                        return {'error': _("No se puede aplicar '%s' porque colisiona con la promoción exclusiva '%s'.", reward.program_id.name, ex_reward.program_id.name)}

        return super()._apply_program_reward(reward, coupon, **kwargs)

    @api.onchange('order_line', 'pricelist_id')
    def _onchange_order_line_check_promotions(self):
        for order in self:
            order.has_unapplied_promotions = order._check_unapplied_promotions()

    def action_apply_pending_promotions(self):
        self.ensure_one()
        self.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
        claimable_rewards = self._get_claimable_rewards()
        applied_reward_ids = self.order_line.filtered('is_reward_line').mapped('reward_id')
        applied_any = False
        for coupon, rewards in claimable_rewards.items():
            sorted_rewards = rewards.sorted(key=lambda r: (r.program_id.sequence, r.id))
            for reward in sorted_rewards.filtered(lambda r: r not in applied_reward_ids and r.program_id.trigger == 'auto'):
                res_apply = self._apply_program_reward(reward, coupon)
                if isinstance(res_apply, dict) and not res_apply.get('error'):
                    applied_any = True
                elif not isinstance(res_apply, dict):
                    applied_any = True
        if applied_any:
            self.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
        self.promo_dismissed = False
        self.has_unapplied_promotions = False
        return True

    def action_dismiss_pending_promotions(self):
        self.ensure_one()
        self.promo_dismissed = True
        self.has_unapplied_promotions = False
        return True

    def write(self, vals):
        res = super().write(vals)
        if not self.env.context.get('skip_loyalty_update'):
            relevant_fields = {'order_line', 'pricelist_id', 'partner_id'}
            if relevant_fields.intersection(vals.keys()):
                # Si solo se actualizaron líneas de recompensa en order_line, evitar re-evaluaciones redundantes
                skip_eval = False
                if 'order_line' in vals and not ({'pricelist_id', 'partner_id'}.intersection(vals.keys())):
                    cmd_list = vals['order_line']
                    if isinstance(cmd_list, (list, tuple)):
                        is_all_reward_cmds = True
                        for cmd in cmd_list:
                            if isinstance(cmd, (list, tuple)) and len(cmd) >= 2:
                                if cmd[0] == 0 and len(cmd) > 2 and isinstance(cmd[2], dict):
                                    if not (cmd[2].get('is_reward_line') or cmd[2].get('reward_id')):
                                        is_all_reward_cmds = False
                                        break
                                elif cmd[0] in (1, 2) and cmd[1]:
                                    target_line = self.env['sale.order.line'].browse(cmd[1])
                                    if not (target_line.is_reward_line or target_line.reward_id):
                                        is_all_reward_cmds = False
                                        break
                                else:
                                    is_all_reward_cmds = False
                                    break
                            else:
                                is_all_reward_cmds = False
                                break
                        if is_all_reward_cmds:
                            skip_eval = True
                if not skip_eval:
                    for order in self.filtered(lambda o: o.state in ('draft', 'sent')):
                        if order.order_line.filtered('is_reward_line'):
                            order.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
                        order.has_unapplied_promotions = order._check_unapplied_promotions()
        return res

    def action_quotation_send(self):
        for order in self.filtered(lambda o: o.state in ('draft', 'sent')):
            if order.order_line.filtered('is_reward_line'):
                order.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
        return super().action_quotation_send()

    def _get_order_lines_to_report(self):
        for order in self.filtered(lambda o: o.state in ('draft', 'sent')):
            if order.order_line.filtered('is_reward_line'):
                order.with_context(skip_loyalty_update=True)._update_programs_and_rewards()
        return super()._get_order_lines_to_report()

    def action_confirm(self):
        if len(self) == 1:
            order = self
            if order._check_unapplied_promotions() and not order.promo_dismissed and not self.env.context.get('skip_loyalty_check'):
                return {
                    'name': _('Promociones disponibles'),
                    'type': 'ir.actions.act_window',
                    'res_model': 'sale.order.loyalty.check.wizard',
                    'view_mode': 'form',
                    'target': 'new',
                    'context': {
                        'default_sale_order_id': order.id,
                    },
                }
        return super(SaleOrder, self.with_context(skip_loyalty_update=True)).action_confirm()

    def _program_check_compute_points(self, programs):
        # Auto-reparar en memoria cualquier regla de bundle_pricing que tenga modo por orden
        for program in programs.filtered(lambda p: p.program_type == 'bundle_pricing'):
            for rule in program.rule_ids:
                if rule.reward_point_mode != 'unit':
                    rule.reward_point_mode = 'unit'
                    rule.reward_point_amount = 1
        return super()._program_check_compute_points(programs)

    def _get_reward_values_discount(self, reward, coupon, **kwargs):
        if reward.discount_mode != 'per_block':
            return super()._get_reward_values_discount(reward, coupon, **kwargs)

        self.ensure_one()
        assert reward.reward_type == 'discount'

        # 1. Verificar restricción de listas de precios si fue especificada
        if reward.program_id.pricelist_ids and self.pricelist_id not in reward.program_id.pricelist_ids:
            return []

        # 2. Filtrar líneas con productos aplicables según modalidad
        if reward._is_cross_product_free():
            trigger_products = reward.trigger_product_ids or reward.program_id.rule_ids.mapped('product_ids')
            reward_products = (reward.discount_product_ids or reward.all_discount_product_ids) - trigger_products
            matching_reward_lines = self.order_line.filtered(
                lambda l: not l.is_reward_line and l.product_uom_qty > 0 and (
                    l.product_id in reward_products if reward_products else (
                        l.product_id not in trigger_products if trigger_products else False
                    )
                )
            )
            # CONDICIÓN ESENCIAL: Si el producto de regalo Y no está en la orden, la promoción no aplica
            if not matching_reward_lines:
                return []

            if trigger_products:
                matching_trigger_lines = self.order_line.filtered(
                    lambda l: not l.is_reward_line and l.product_uom_qty > 0 and l.product_id in trigger_products
                )
            else:
                matching_trigger_lines = self.order_line.filtered(
                    lambda l: not l.is_reward_line and l.product_uom_qty > 0 and l.product_id not in matching_reward_lines.product_id
                )

            total_trigger_qty = sum(matching_trigger_lines.mapped('product_uom_qty'))
            bundle_qty = reward.bundle_qty or (reward.program_id.rule_ids[:1].minimum_qty and int(reward.program_id.rule_ids[:1].minimum_qty)) or 1
            complete_blocks = int(total_trigger_qty // bundle_qty)
            if complete_blocks <= 0:
                return []

            free_qty_per_block = reward.free_qty or 1
            max_free_units = complete_blocks * free_qty_per_block
            total_reward_qty = sum(matching_reward_lines.mapped('product_uom_qty'))
            effective_free_units = min(total_reward_qty, max_free_units)
            if effective_free_units <= 0:
                return []

            max_discount = 0.0
            accum_free = 0.0
            for line in matching_reward_lines.sorted(key=lambda l: l.price_reduce):
                take = min(line.product_uom_qty, effective_free_units - accum_free)
                max_discount += line.price_reduce * take
                accum_free += take
                if accum_free >= effective_free_units:
                    break
        else:
            if reward._is_cross_product_free() or reward.bundle_pricing_mode not in ('target_price', 'free_units', 'fixed_discount'):
                return []
            if reward.discount_applicability == 'specific':
                reward_domain = reward._get_discount_product_domain()
                matching_lines = self.order_line.filtered(
                    lambda l: not l.is_reward_line and l.product_uom_qty > 0 and (
                        l.product_id.filtered_domain(reward_domain) if reward_domain else True
                    )
                )
            else:
                matching_lines = self.order_line.filtered(
                    lambda l: not l.is_reward_line and l.product_uom_qty > 0
                )
            total_qty = sum(matching_lines.mapped('product_uom_qty'))
            bundle_qty = reward.bundle_qty or 3
            complete_blocks = int(total_qty // bundle_qty)
            if complete_blocks <= 0:
                return []

            # 3. Calcular importe del descuento según la modalidad configurada
            if reward.bundle_pricing_mode == 'target_price' and reward.bundle_price > 0:
                promo_units = complete_blocks * bundle_qty
                current_cost = 0.0
                accum_qty = 0.0
                for line in matching_lines.sorted(key=lambda l: l.price_reduce, reverse=True):
                    take = min(line.product_uom_qty, promo_units - accum_qty)
                    current_cost += line.price_reduce * take
                    accum_qty += take
                    if accum_qty >= promo_units:
                        break
                target_cost = complete_blocks * reward.bundle_price
                max_discount = max(0.0, current_cost - target_cost)
            elif reward.bundle_pricing_mode == 'free_units':
                free_qty_per_block = reward.free_qty or 1
                total_free_units = complete_blocks * free_qty_per_block
                max_discount = 0.0
                accum_free = 0.0
                for line in matching_lines.sorted(key=lambda l: l.price_reduce):
                    take = min(line.product_uom_qty, total_free_units - accum_free)
                    max_discount += line.price_reduce * take
                    accum_free += take
                    if accum_free >= total_free_units:
                        break
            else:
                max_discount = complete_blocks * reward.discount

        if float_is_zero(max_discount, precision_digits=2) or max_discount <= 0:
            return []

        # 4. Ajustar divisa y tope del pedido
        max_discount = reward.currency_id._convert(
            max_discount, self.currency_id, self.company_id, fields.Date.today()
        )
        max_discount = min(self.amount_total, max_discount)

        # 5. Obtener bases gravables para prorratear impuestos
        if reward._is_cross_product_free():
            from collections import defaultdict
            discountable = max_discount
            discountable_per_tax = defaultdict(float)
            accum_tax = 0.0
            for line in matching_reward_lines.sorted(key=lambda l: l.price_reduce):
                take = min(line.product_uom_qty, effective_free_units - accum_tax)
                discountable_per_tax[line.tax_id] += line.price_reduce * take
                accum_tax += take
                if accum_tax >= effective_free_units:
                    break
            discount_factor = 1.0
        elif reward.discount_applicability == 'specific':
            discountable, discountable_per_tax = self._discountable_specific(reward)
            discount_factor = min(1.0, max_discount / discountable) if discountable else 1.0
        else:
            discountable, discountable_per_tax = self._discountable_order(reward)
            discount_factor = min(1.0, max_discount / discountable) if discountable else 1.0
        reward_code = _generate_random_reward_code()
        sequence = max(self.order_line.filtered(lambda x: not x.is_reward_line).mapped('sequence'), default=10) + 1
        mapped_taxes = {tax: self.fiscal_position_id.map_tax(tax) for tax in discountable_per_tax}

        reward_dict = {tax: {
            'name': _(
                'Descuento: %(desc)s%(tax_str)s',
                desc=reward.description or f'{complete_blocks} paquete(s) de {bundle_qty}',
                tax_str=len(discountable_per_tax) and any(t.name for t in mapped_taxes[tax]) and _(' - Impuestos: %(taxes)s', taxes=", ".join(mapped_taxes[tax].mapped('name'))) or '',
            ),
            'product_id': reward.discount_line_product_id.id,
            'price_unit': -(price * discount_factor),
            'product_uom_qty': 1.0,
            'product_uom': reward.discount_line_product_id.uom_id.id,
            'reward_id': reward.id,
            'coupon_id': coupon.id,
            'points_cost': complete_blocks * bundle_qty,
            'reward_identifier_code': reward_code,
            'sequence': sequence,
            'tax_id': [(Command.CLEAR, 0, 0)] + [(Command.LINK, tax.id, False) for tax in mapped_taxes[tax]]
        } for tax, price in discountable_per_tax.items() if price}

        return list(reward_dict.values())

    def _compute_invoice_status(self):
        super()._compute_invoice_status()
        for order in self:
            if order.state in ('sale', 'done') and order.invoice_status == 'no':
                # Si las líneas básicas ya están facturadas y aún quedan líneas de descuento pendientes de facturar
                has_invoiced_basic = any(not l.is_reward_line and l.invoice_status == 'invoiced' for l in order.order_line)
                has_pending_reward = any(l.is_reward_line and l.invoice_status == 'to invoice' for l in order.order_line)
                if has_invoiced_basic and has_pending_reward:
                    order.invoice_status = 'to invoice'

    def _get_invoiceable_lines(self, final=False):
        invoiceable_lines = super()._get_invoiceable_lines(final)
        if invoiceable_lines:
            return invoiceable_lines
        # Si sale_loyalty devolvió vacío porque solo restan líneas de recompensa por facturar,
        # pero las líneas básicas ya fueron facturadas con anterioridad (ej. factura previa donde se omitió el descuento),
        # permitimos facturar las líneas de recompensa pendientes:
        reward_to_invoice = self.order_line.filtered(
            lambda l: l.is_reward_line and not float_is_zero(l.qty_to_invoice, precision_digits=2)
        )
        if reward_to_invoice and any(not l.is_reward_line and l.qty_invoiced > 0 for l in self.order_line):
            return reward_to_invoice
        return invoiceable_lines
