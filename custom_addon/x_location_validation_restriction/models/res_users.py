from odoo import models, fields

class ResUsers(models.Model):
    _inherit = "res.users"

    x_location_allowed = fields.Many2many(
        "stock.location",
        string="Allowed Validation Locations"
    )