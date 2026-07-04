from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    pricing_family_id = fields.Many2one(
        'product.pricing.family',
        string='Pricing Family',
        help='Products in the same pricing family accumulate quantities for pricelist rules.',
    )
