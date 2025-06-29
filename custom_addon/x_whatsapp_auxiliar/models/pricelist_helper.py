from odoo import models, fields

class PricelistHelper(models.AbstractModel):
    _name = 'custom.pricelist.helper'
    _description = 'Helper para filtrar y ordenar ítems de listas de precios'

    def get_sorted_pricelist_items(self, product_id, pricelist_id=1):
        if not product_id:
            return [], []

        pricelist = self.env['product.pricelist'].sudo().browse(pricelist_id)
        now = fields.Datetime.now()

        matched_items = pricelist.item_ids.filtered(
            lambda item:
                item.product_tmpl_id.id == product_id.product_tmpl_id.id and (
                    (item.date_start and item.date_end and item.date_start <= now and item.date_end >= now) or
                    (item.date_start and not item.date_end and item.date_start <= now) or
                    (not item.date_start and item.date_end and item.date_end >= now) or
                    (not item.date_start and not item.date_end)
                )
        )

        sorted_items = matched_items.sorted(key=lambda item: item.min_quantity)
        price_list_values = [item.fixed_price for item in sorted_items]
        min_qty_list_values = [item.min_quantity for item in sorted_items]

        return price_list_values, min_qty_list_values
