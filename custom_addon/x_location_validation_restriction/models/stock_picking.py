from odoo import models, fields, api

class StockPicking(models.Model):
    _inherit = "stock.picking"

    x_user_can_validate = fields.Boolean(
        compute="_compute_user_can_validate",
        store=False
    )

    @api.depends("location_dest_id")
    def _compute_user_can_validate(self):
        user = self.env.user
        allowed_locations = user.x_validation_allowed.ids
        for record in self:
            record.x_user_can_validate = record.location_dest_id.id in allowed_locations