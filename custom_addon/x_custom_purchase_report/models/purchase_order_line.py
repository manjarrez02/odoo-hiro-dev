# models/purchase_order_line.py
from odoo import fields, models

class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    product_supplier_code = fields.Char(
        string='Cód. Proveedor',
        compute='_compute_product_supplier_code',
        store=False
    )

    def _compute_product_supplier_code(self):
        for line in self:
            supplier_info = line.product_id.seller_ids.filtered(
                lambda s: s.partner_id == line.order_id.partner_id
            )
            line.product_supplier_code = supplier_info[:1].product_code if supplier_info else False