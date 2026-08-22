# models/purchase_order_line.py
from odoo import fields, models


class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    product_supplier_code = fields.Char(
        string='Cód. Proveedor',
        compute='_compute_product_supplier_info',
        store=False
    )

    product_supplier_name = fields.Char(
        string='Nombre Proveedor',
        compute='_compute_product_supplier_info',
        store=False
    )

    def _compute_product_supplier_info(self):
        for line in self:
            supplier_info = line.product_id.seller_ids.filtered(
                lambda s: s.partner_id == line.order_id.partner_id
            )
            if supplier_info:
                line.product_supplier_code = supplier_info[:1].product_code
                line.product_supplier_name = supplier_info[:1].product_name
            else:
                line.product_supplier_code = False
                line.product_supplier_name = False