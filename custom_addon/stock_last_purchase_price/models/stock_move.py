# -*- coding: utf-8 -*-
################################################################################
#
#    Cybrosys Technologies Pvt. Ltd.
#
#    Copyright (C) 2023-TODAY Cybrosys Technologies(<https://www.cybrosys.com>).
#    Author: Sruthi Renjith (odoo@cybrosys.com)
#
#    You can modify it under the terms of the GNU AFFERO
#    GENERAL PUBLIC LICENSE (AGPL v3), Version 3.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU AFFERO GENERAL PUBLIC LICENSE (AGPL v3) for more details.
#
#    You should have received a copy of the GNU AFFERO GENERAL PUBLIC LICENSE
#    (AGPL v3) along with this program.
#    If not, see <http://www.gnu.org/licenses/>.
#
################################################################################
from collections import defaultdict
from odoo import models, _
from odoo.exceptions import UserError
from odoo.tools import float_is_zero


class StockMove(models.Model):
    """ Class to inherit stock_move to update the product price """
    _inherit = "stock.move"

    def product_price_update_before_done(self, forced_qty=None):

        tmpl_dict = defaultdict(lambda: 0.0)
        # adapt standard price on incomming moves if the product cost_method is 'average'
        std_price_update = {}
        for move in self.filtered(
                lambda move: move._is_in() and move.with_company(
                        move.company_id).product_id.cost_method == 'average'):
            product_tot_qty_available = move.product_id.sudo().with_company(
                move.company_id).quantity_svl + tmpl_dict[move.product_id.id]
            rounding = move.product_id.uom_id.rounding

            valued_move_lines = move._get_in_move_lines()
            qty_done = 0
            for valued_move_line in valued_move_lines:
                qty_done += valued_move_line.product_uom_id._compute_quantity(
                    valued_move_line.qty_done, move.product_id.uom_id)

            qty = forced_qty or qty_done
            if float_is_zero(product_tot_qty_available,
                             precision_rounding=rounding):
                new_std_price = move._get_price_unit()
            elif float_is_zero(product_tot_qty_available + move.product_qty,
                               precision_rounding=rounding) or \
                    float_is_zero(product_tot_qty_available + qty,
                                  precision_rounding=rounding):
                new_std_price = move._get_price_unit()
            else:
                # Get the standard price
                amount_unit = std_price_update.get((move.company_id.id,
                                                    move.product_id.id)) or move.product_id.with_company(
                    move.company_id).standard_price
                new_std_price = ((amount_unit * product_tot_qty_available) + (
                            move._get_price_unit() * qty)) / (
                                            product_tot_qty_available + qty)

            tmpl_dict[move.product_id.id] += qty_done
            # Write the standard price, as SUPERUSER_ID because a warehouse manager may not have the right to write on products
            move.product_id.with_company(move.company_id.id).with_context(
                disable_auto_svl=True).sudo().write(
                {'standard_price': new_std_price})
            std_price_update[
                move.company_id.id, move.product_id.id] = new_std_price

        # adapt standard price on incomming moves if the product cost_method
        # is 'fifo'
        for move in self.filtered(lambda move:
                                  move.with_company(
                                      move.company_id).product_id.cost_method == 'fifo'
                                  and float_is_zero(
                                      move.product_id.sudo().quantity_svl,
                                      precision_rounding=move.product_id.uom_id.rounding)):
            move.product_id.with_company(move.company_id.id).sudo().write(
                {'standard_price': move._get_price_unit()})
            # Add new costing method for 'last' with real-time or
            # manual_periodic valuation
        # Filter moves based on conditions
        # Costeo 'last' (último costo) con impuestos incluidos en el costo
        for move in self.filtered(lambda move: move.with_company(
                move.company_id).product_id.cost_method == 'last' and
            (move.product_id.valuation == 'real_time' or move.product_id.valuation == 'manual_periodic')):

            # Costo base (sin impuestos) que Odoo usa para valoración
            base_unit_cost = move._get_price_unit()

            # Default: moneda y partner
            company = move.company_id
            company_currency = company.currency_id
            currency = company_currency
            partner = move.picking_id.partner_id

            # Intentar tomar impuestos y moneda desde la línea de compra
            taxes = self.env['account.tax']
            if getattr(move, 'purchase_line_id', False) and move.purchase_line_id:
                taxes = move.purchase_line_id.taxes_id.filtered(
                    lambda t: (t.company_id == company) and (t.type_tax_use in ('purchase', 'none'))
                )
                if move.purchase_line_id.currency_id:
                    currency = move.purchase_line_id.currency_id

            # Si hay impuestos, calcular precio con impuestos incluidos
            price_with_taxes = base_unit_cost
            if taxes:
                tax_res = taxes.compute_all(
                    base_unit_cost,
                    currency=currency,
                    quantity=1.0,
                    product=move.product_id,
                    partner=partner,
                )
                # total_included = precio unitario + impuestos (resuelve si price_include estaba marcado)
                price_with_taxes = tax_res.get('total_included', base_unit_cost)

            # Convertir a moneda de la compañía si es necesario
            if currency != company_currency:
                price_with_taxes = currency._convert(
                    from_amount=price_with_taxes,
                    to_currency=company_currency,
                    company=company,
                    date=move.date or fields.Date.context_today(self)
                )

            new_std_price = price_with_taxes

            # Escribir el nuevo standard_price (como superuser, y sin SVL automático)
            move.product_id.with_company(company.id).with_context(
                disable_auto_svl=True
            ).sudo().write({'standard_price': new_std_price})


