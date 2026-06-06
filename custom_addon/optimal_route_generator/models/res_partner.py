
from odoo import models, fields, api
from datetime import datetime

class ResPartner(models.Model):
    _inherit = "res.partner"

    def action_generate_contact_route(self):

        return {
            "name": "Generate Route",
            "type": "ir.actions.act_window",
            "res_model": "route.wizard",
            "view_mode": "form",
            "target": "new",
            "context": {
                "default_destination_ids": self.filtered(lambda p: p.partner_latitude and p.partner_longitude).ids,
            }
        }
