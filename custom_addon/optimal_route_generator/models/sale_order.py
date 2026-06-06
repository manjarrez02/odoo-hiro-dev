
from odoo import models, fields, api
from datetime import datetime

class SaleOrder(models.Model):
    _inherit = "sale.order"

    def action_generate_sale_route(self):
        partners = self.mapped("partner_id").filtered(lambda p: p.partner_latitude and p.partner_longitude)

        return {
            "name": "Generate Route",
                "type": "ir.actions.act_window",
                "view_mode": "form",
                "views": [(False, "form")],
                "res_model": "route.wizard",
                "target": "new",
                "context": {
                    "default_destination_ids": partners.ids,
                }
            }
    