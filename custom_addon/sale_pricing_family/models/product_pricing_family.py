from odoo import fields, models


class ProductPricingFamily(models.Model):
    _name = 'product.pricing.family'
    _description = 'Product Pricing Family'
    _order = 'name'

    name = fields.Char(required=True)
    active = fields.Boolean(default=True)
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        default=lambda self: self.env.company,
    )
    product_tmpl_ids = fields.One2many(
        'product.template',
        'pricing_family_id',
        string='Products',
    )