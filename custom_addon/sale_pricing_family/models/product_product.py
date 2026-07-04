# models/product_product.py
from odoo import fields, models

class ProductProduct(models.Model):
    _inherit = 'product.product'

    pricing_family_id = fields.Many2one(
        related='product_tmpl_id.pricing_family_id',
        string='Pricing Family',        
        readonly=True,
    )