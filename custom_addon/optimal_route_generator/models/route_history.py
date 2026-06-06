from odoo import models, fields, api, _
from odoo.exceptions import UserError


class RouteHistory(models.Model):
    _name = "route.history"
    _description = "Generated Route History"
    _order = "create_date desc"

    name = fields.Char(string="Route Name", required=True, default=lambda self: _("Generated Route"), copy=False)
    origin_id = fields.Many2one("res.partner", string="Origin", required=True)
    destination_ids = fields.Many2many("res.partner", string="Destinations (Ordered)")
    line_ids = fields.One2many("route.history.line", "history_id", string="Stops", copy=True)
    google_url = fields.Char(string="Google Maps URL")
    optimize = fields.Boolean(string="Optimize Route", default=True)
    final_id = fields.Many2one("res.partner", string="Final Contact")
    departure_time = fields.Datetime(string="Departure Date and Time")
    avoid_tolls = fields.Boolean(string="Avoid tolls")
    avoid_highways = fields.Boolean(string="Avoid highways")
    avoid_ferries = fields.Boolean(string="Avoid ferries")
    note = fields.Text(string="General Notes")
    sequence_name = fields.Char(string="Folio", readonly=True, copy=False, default=lambda self: _("New"))
    total_duration_seconds = fields.Integer(string="Total Duration (seconds)")
    total_duration_display = fields.Char(string="Total Duration", compute="_compute_total_duration_display")

    @api.depends("total_duration_seconds")
    def _compute_total_duration_display(self):
        for rec in self:
            rec.total_duration_display = rec._format_duration(rec.total_duration_seconds)

    def _format_duration(self, seconds):
        seconds = int(seconds or 0)
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}"

    @api.model_create_multi
    def create(self, vals_list):
        seq = self.env["ir.sequence"]
        for vals in vals_list:
            if not vals.get("sequence_name") or vals.get("sequence_name") == _("New"):
                vals["sequence_name"] = seq.next_by_code("route.history") or _("New")
        return super().create(vals_list)

    def action_generate_route(self):
        self.ensure_one()
        return {
            "name": _("Modify Route %s") % self.name,
            "type": "ir.actions.act_window",
            "res_model": "route.wizard",
            "view_mode": "form",
            "target": "new",
            "context": {
                "default_name": self.name,
                "default_origin_id": self.origin_id.id,
                "default_destination_ids": self.destination_ids.ids,
                "default_final_id": self.final_id.id if self.final_id else False,
                "default_optimize": self.optimize,
                "default_departure_time": self.departure_time,
                "default_avoid_tolls": self.avoid_tolls,
                "default_avoid_highways": self.avoid_highways,
                "default_avoid_ferries": self.avoid_ferries,
                "default_history_id": self.id,
                "default_note": self.note,
            },
        }

    def action_open_map(self):
        self.ensure_one()
        if not self.google_url:
            raise UserError(_("This route does not have a generated Google Maps URL yet."))
        return {"type": "ir.actions.act_url", "url": self.google_url, "target": "new"}


class RouteHistoryLine(models.Model):
    _name = "route.history.line"
    _description = "Route History Stop"
    _order = "sequence, id"

    history_id = fields.Many2one("route.history", string="History", required=True, ondelete="cascade")
    sequence = fields.Integer(default=10)
    partner_id = fields.Many2one("res.partner", string="Stop", required=True)
    note = fields.Char(string="Stop Note")
    leg_duration_seconds = fields.Integer(string="Time from previous point (seconds)")
    leg_duration_display = fields.Char(string="Time from previous point", compute="_compute_leg_duration_display")

    @api.depends("leg_duration_seconds")
    def _compute_leg_duration_display(self):
        for rec in self:
            seconds = int(rec.leg_duration_seconds or 0)
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            rec.leg_duration_display = f"{hours:02d}:{minutes:02d}"
