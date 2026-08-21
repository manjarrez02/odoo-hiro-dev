from odoo import api, fields, models

from odoo import api, fields, models

class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    on_hand = fields.Float(
        string='Cantidad a mano',
        related='product_id.qty_available',
        readonly=True,
        store=True
    )
