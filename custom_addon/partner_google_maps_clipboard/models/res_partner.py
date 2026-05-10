from odoo import api, fields, models, _
from odoo.exceptions import UserError


class ResPartner(models.Model):
    _inherit = "res.partner"

    google_maps_url = fields.Char(
        string="Google Maps URL",
        compute="_compute_google_maps_url",
    )

    google_maps_url_copy = fields.Char(
        string="Copiar URL Maps",
        related="google_maps_url",
        readonly=True,
    )

    @api.depends("partner_latitude", "partner_longitude")
    def _compute_google_maps_url(self):
        for partner in self:
            if partner.partner_latitude and partner.partner_longitude:
                partner.google_maps_url = (
                    "https://www.google.com/maps/search/?api=1&query=%s,%s"
                    % (partner.partner_latitude, partner.partner_longitude)
                )
            else:
                partner.google_maps_url = False

    def action_open_google_maps(self):
        self.ensure_one()
        if not self.google_maps_url:
            raise UserError(_("El partner no tiene coordenadas registradas."))
        return {
            "type": "ir.actions.act_url",
            "url": self.google_maps_url,
            "target": "new",
        }

    def action_notify_google_maps_url(self):
        self.ensure_one()
        if not self.google_maps_url:
            raise UserError(_("El partner no tiene coordenadas registradas."))
        return {
            "type": "ir.actions.client",
            "tag": "display_notification",
            "params": {
                "title": _("URL de Google Maps"),
                "message": self.google_maps_url,
                "type": "success",
                "sticky": True,
            },
        }