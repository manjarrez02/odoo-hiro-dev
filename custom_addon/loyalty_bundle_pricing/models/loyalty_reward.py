# -*- coding: utf-8 -*-
from odoo import _, api, fields, models
from odoo.exceptions import ValidationError
from odoo.osv import expression

class LoyaltyReward(models.Model):
    _inherit = 'loyalty.reward'

    def _get_discount_mode_select(self):
        res = list(super()._get_discount_mode_select())
        if not any(k == 'per_block' for k, _ in res):
            res.append(('per_block', _('Por bloque de unidades')))
        return res

    discount_mode = fields.Selection(
        selection='_get_discount_mode_select',
    )

    bundle_qty = fields.Integer(
        string='Unidades por Bloque',
        default=3,
        help="Cantidad de piezas para armar un paquete (ej. 3 unidades)."
    )

    bundle_price = fields.Monetary(
        string='Precio Objetivo del Bloque',
        currency_field='currency_id',
        help="Precio final esperado por cada paquete de X unidades (ej. $50.00)."
    )

    bundle_pricing_mode = fields.Selection([
        ('target_price', 'Precio Tope Dinámico (Garantizar $Y por bloque)'),
        ('fixed_discount', 'Descuento Fijo por Bloque'),
        ('free_units', 'Unidades Bonificadas por Bloque (ej. 2x1, 3x2)'),
        ('cross_product_free', 'Compra X y Recibe Y Gratis (Condicionado a marcar Y)'),
    ], default='target_price', string='Modalidad de Bloque', required=False,
       help="Precio Tope Dinámico bonifica el diferencial para que el trío cueste exactamente $Y sin perjudicar tarifas mayoristas inferiores. Descuento Fijo resta un importe constante por cada bloque. Unidades Bonificadas bonifica las piezas gratis dentro de cada bloque (ej. 1 pieza en un 3x2). Compra X y Recibe Y Gratis descuenta al 100% el producto Y solo si este es añadido a la orden.")

    free_qty = fields.Integer(
        string='Unidades Gratis por Bloque',
        default=1,
        help="Cantidad de piezas bonificadas / gratis dentro de cada bloque (ej. 1 unidad gratis en un 3x2 o 1 regalo Y por cada X)."
    )

    trigger_product_ids = fields.Many2many(
        'product.product',
        'loyalty_reward_trigger_product_rel',
        'reward_id',
        'product_id',
        string='Producto(s) a Comprar (X)',
        help="Productos que activan la promoción al ser adquiridos. Si se deja vacío, se toman los productos definidos en las reglas del programa."
    )

    prevent_below_cost = fields.Boolean(
        string='Proteger Precio de Costo (Piso Financiero)',
        default=True,
        help="Impide que los descuentos otorgados reduzcan el ingreso neto por debajo del costo estándar (standard_price) del producto."
    )

    min_margin_pc = fields.Float(
        string='Margen Mínimo de Seguridad (%)',
        default=0.0,
        help="Margen porcentual mínimo a garantizar sobre el costo del producto (ej. 5% = costo * 1.05)."
    )

    def init(self):
        super().init()
        # Asegurar que la columna bundle_pricing_mode no tenga restriccion NOT NULL en base de datos
        self.env.cr.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'loyalty_reward' 
                      AND column_name = 'bundle_pricing_mode' 
                      AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE loyalty_reward ALTER COLUMN bundle_pricing_mode DROP NOT NULL;
                END IF;
            END $$;
        """)
        # Asegurar que todos los productos de descuento asociados a recompensas tengan politica 'order'
        self.env.cr.execute("""
            UPDATE product_template pt
            SET invoice_policy = 'order'
            FROM product_product pp
            JOIN loyalty_reward lr ON lr.discount_line_product_id = pp.id
            WHERE pt.id = pp.product_tmpl_id
              AND (pt.invoice_policy IS NULL OR pt.invoice_policy != 'order');
        """)

    @api.depends('reward_type', 'discount_mode', 'bundle_qty', 'bundle_price', 'bundle_pricing_mode', 'free_qty', 'discount', 'trigger_product_ids', 'discount_product_ids', 'program_id.rule_ids.product_ids')
    def _compute_description(self):
        super()._compute_description()
        for reward in self:
            if reward.reward_type == 'discount' and reward.discount_mode == 'per_block':
                symbol = reward.currency_id.symbol or '$'
                if reward.bundle_pricing_mode == 'target_price':
                    reward.description = _("Paquete de %(qty)s uds. por %(symbol)s%(price)g",
                                           qty=reward.bundle_qty, symbol=symbol, price=reward.bundle_price)
                elif reward.bundle_pricing_mode == 'free_units':
                    pay_qty = max(0, reward.bundle_qty - (reward.free_qty or 1))
                    reward.description = _("Promoción %(total)sx%(pay)s (%(free)s gratis por cada %(total)s uds.)",
                                           total=reward.bundle_qty, pay=pay_qty, free=reward.free_qty or 1)
                elif reward.bundle_pricing_mode == 'cross_product_free':
                    x_prods = reward.program_id.rule_ids.mapped('product_ids') or reward.trigger_product_ids
                    x_names = ", ".join(x_prods.mapped('name')) or _("Compra X")
                    y_names = ", ".join(reward.discount_product_ids.mapped('name')) or _("Regalo Y")
                    reward.description = _("Compra %(bx)s de [%(x)s] y lleva %(by)s gratis de [%(y)s]",
                                           bx=reward.bundle_qty, x=x_names, by=reward.free_qty or 1, y=y_names)
                else:
                    reward.description = _("Descuento de %(symbol)s%(disc)g por cada %(qty)s uds.",
                                           symbol=symbol, disc=reward.discount, qty=reward.bundle_qty)

    def _is_cross_product_free(self):
        self.ensure_one()
        if self.bundle_pricing_mode == 'cross_product_free':
            return True
        if self.bundle_pricing_mode in ('target_price', 'free_units', 'fixed_discount'):
            return False
        # Heurística estricta solo para registros históricos con bundle_pricing_mode NULL
        if self.discount_mode == 'per_block' and not self.bundle_pricing_mode:
            desc = (self.description or '').lower()
            if 'gratis' in desc and ('compra' in desc or 'lleva' in desc or 'recibe' in desc) and not ('x' in desc or 'uds' in desc):
                return True
        return False

    def _get_discount_product_domain(self):
        domain = super()._get_discount_product_domain()
        for reward in self:
            if reward.discount_mode == 'per_block' and reward._is_cross_product_free():
                if reward.discount_product_ids:
                    domain = [('id', 'in', reward.discount_product_ids.ids)]
                elif reward.discount_product_category_id:
                    child_cats = reward._find_all_category_children(reward.discount_product_category_id, [])
                    cats = [reward.discount_product_category_id.id] + child_cats
                    domain = [('categ_id', 'in', cats)]
                if reward.trigger_product_ids:
                    domain = expression.AND([domain, [('id', 'not in', reward.trigger_product_ids.ids)]])
                elif reward.program_id.rule_ids.mapped('product_ids'):
                    rule_prods = reward.program_id.rule_ids.mapped('product_ids')
                    domain = expression.AND([domain, [('id', 'not in', rule_prods.ids)]])
        return domain

    @api.depends('discount_product_ids', 'bundle_pricing_mode', 'discount_mode', 'trigger_product_ids', 'program_id.rule_ids.product_ids')
    def _compute_all_discount_product_ids(self):
        super()._compute_all_discount_product_ids()
        for reward in self:
            if reward.discount_mode == 'per_block':
                if reward._is_cross_product_free():
                    trigger_prods = reward.trigger_product_ids or reward.program_id.rule_ids.mapped('product_ids')
                    if reward.discount_product_ids:
                        # Exclude trigger products (X) from the gift products (Y) — X ∩ Y = ∅
                        if trigger_prods:
                            reward.all_discount_product_ids = reward.discount_product_ids - trigger_prods
                        else:
                            reward.all_discount_product_ids = reward.discount_product_ids
                    elif reward.discount_product_category_id:
                        child_cats = reward._find_all_category_children(reward.discount_product_category_id, [])
                        cats = [reward.discount_product_category_id.id] + child_cats
                        domain = [('categ_id', 'in', cats)]
                        if trigger_prods:
                            domain = expression.AND([domain, [('id', 'not in', trigger_prods.ids)]])
                        reward.all_discount_product_ids = self.env['product.product'].search(domain)
                    else:
                        reward.all_discount_product_ids = self.env['product.product']
                else:
                    # Modalidades estándar de bloque (free_units ej. 2x1/3x2, target_price, fixed_discount)
                    # Si tiene discount_product_ids se respeta; si está vacío, hereda los productos de las reglas
                    rule_prods = reward.program_id.rule_ids.mapped('product_ids')
                    if reward.discount_product_ids:
                        reward.all_discount_product_ids = reward.discount_product_ids
                    elif rule_prods:
                        reward.all_discount_product_ids = rule_prods

    @api.onchange('bundle_pricing_mode', 'program_id')
    def _onchange_bundle_pricing_mode(self):
        if self.bundle_pricing_mode == 'cross_product_free':
            self.discount_applicability = 'specific'
            self.discount = 100.0
            rule = self.program_id.rule_ids[:1]
            if rule:
                if not self.bundle_qty or self.bundle_qty == 1:
                    self.bundle_qty = int(rule.minimum_qty or 1)
                if not self.trigger_product_ids and rule.product_ids:
                    self.trigger_product_ids = rule.product_ids
            if not self.bundle_qty:
                self.bundle_qty = 1
            if not self.free_qty:
                self.free_qty = 1

    @api.onchange('discount_mode', 'bundle_qty')
    def _onchange_bundle_qty_sync_points(self):
        if self.discount_mode == 'per_block' and self.bundle_qty:
            self.required_points = self.bundle_qty

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('discount_mode') == 'per_block' and vals.get('bundle_qty'):
                vals.setdefault('required_points', vals['bundle_qty'])
            if 'bundle_pricing_mode' in vals and not vals['bundle_pricing_mode']:
                vals['bundle_pricing_mode'] = 'target_price'
            if vals.get('bundle_pricing_mode') == 'cross_product_free':
                vals['discount_applicability'] = 'specific'
                vals['discount'] = 100.0
                if vals.get('program_id'):
                    program = self.env['loyalty.program'].browse(vals['program_id'])
                    rule = program.rule_ids[:1]
                    if rule:
                        if not vals.get('bundle_qty'):
                            vals['bundle_qty'] = int(rule.minimum_qty or 1)
                        if not vals.get('trigger_product_ids') and rule.product_ids:
                            vals['trigger_product_ids'] = [(6, 0, rule.product_ids.ids)]
        return super().create(vals_list)

    def write(self, vals):
        if vals.get('discount_mode') == 'per_block' or any(r.discount_mode == 'per_block' for r in self):
            bundle_qty = vals.get('bundle_qty')
            if bundle_qty:
                vals.setdefault('required_points', bundle_qty)
        if 'bundle_pricing_mode' in vals and not vals['bundle_pricing_mode']:
            vals['bundle_pricing_mode'] = 'target_price'
        if vals.get('bundle_pricing_mode') == 'cross_product_free' or any(r.bundle_pricing_mode == 'cross_product_free' for r in self):
            vals['discount_applicability'] = 'specific'
            vals['discount'] = 100.0
            for reward in self:
                rule = reward.program_id.rule_ids[:1]
                if rule and rule.product_ids and not vals.get('trigger_product_ids'):
                    vals['trigger_product_ids'] = [(6, 0, rule.product_ids.ids)]
        return super().write(vals)

    @api.constrains('discount_mode', 'bundle_qty', 'bundle_pricing_mode', 'free_qty')
    def _check_bundle_fields(self):
        for reward in self:
            if reward.discount_mode == 'per_block':
                if reward.bundle_qty <= 0:
                    raise ValidationError(_("La cantidad de unidades por bloque debe ser un entero estrictamente mayor a cero."))
                if not reward.bundle_pricing_mode:
                    raise ValidationError(_("Debe seleccionar una Modalidad de Bloque para las promociones por bloque."))
                if reward.bundle_pricing_mode == 'free_units':
                    if reward.free_qty <= 0:
                        raise ValidationError(_("La cantidad de unidades gratis debe ser un entero mayor a cero."))
                    if reward.free_qty >= reward.bundle_qty:
                        raise ValidationError(_("La cantidad de unidades gratis (%(free)s) debe ser menor a la cantidad de unidades por bloque (%(bundle)s).", free=reward.free_qty, bundle=reward.bundle_qty))
                elif reward.bundle_pricing_mode == 'cross_product_free':
                    if reward.free_qty <= 0:
                        raise ValidationError(_("La cantidad de unidades gratis (Y) debe ser un entero mayor a cero."))
                    if not reward.discount_product_ids and not reward.discount_product_category_id:
                        raise ValidationError(_("Para la modalidad 'Compra X y Recibe Y Gratis', debe especificar el o los Producto(s) de Regalo (Y)."))

    @api.constrains('bundle_price', 'bundle_qty', 'bundle_pricing_mode', 'free_qty', 'discount', 'discount_product_ids', 'trigger_product_ids', 'prevent_below_cost', 'min_margin_pc')
    def _check_reward_margin_safety(self):
        for reward in self:
            program = reward.program_id
            if program and program.active and program.prevent_below_cost and not program.allow_loss_leader:
                deficits = program._evaluate_margin_deficits()
                if deficits:
                    details = "\n".join([
                        f"• [{d['code'] or 'SKU'}] {d['name']}: {d['reason']} | Déficit: -${d['loss']:.2f} (-{d['loss_pc']:.1f}%)"
                        for d in deficits[:5]
                    ])
                    raise ValidationError(_(
                        "¡Bloqueo Preventivo de Margen en Recompensa!\n\n"
                        "Los valores configurados generan venta bajo costo en los siguientes productos:\n\n"
                        "%(details)s\n\n"
                        "Ajuste los valores de la recompensa o autorice la venta a pérdida en el programa marcando 'Autorizar Venta a Pérdida'."
                    ) % {'details': details})

    def _get_discount_product_values(self):
        res = super()._get_discount_product_values()
        for vals in res:
            vals['invoice_policy'] = 'order'
        return res

    def _create_missing_discount_line_products(self):
        super()._create_missing_discount_line_products()
        for reward in self:
            if reward.discount_line_product_id and reward.discount_line_product_id.invoice_policy != 'order':
                reward.discount_line_product_id.product_tmpl_id.invoice_policy = 'order'


