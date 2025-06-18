from odoo import models, fields, api
import ipaddress
from odoo.exceptions import ValidationError, AccessDenied


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    unauthorized_notification_enabled = fields.Boolean(
        string="Enable Unauthorized Login Notifications",
        help="Enable or disable email notifications for unauthorized login attempts.",
    )

    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        res.update(
            unauthorized_notification_enabled=self.env["ir.config_parameter"]
            .sudo()
            .get_param("unauthorized_notification_enabled", default=False)
        )
        return res

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        self.env["ir.config_parameter"].sudo().set_param(
            "unauthorized_notification_enabled", self.unauthorized_notification_enabled
        )







