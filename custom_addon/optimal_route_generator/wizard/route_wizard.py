# -*- coding: utf-8 -*-
from datetime import timedelta
from urllib.parse import urlencode

from odoo import models, fields, _, api
from odoo.exceptions import ValidationError, UserError


class RouteWizard(models.TransientModel):
    _name = "route.wizard"
    _description = "Optimal Route Wizard"

    name = fields.Char("Route Name")
    history_id = fields.Many2one("route.history", string="History")
    origin_id = fields.Many2one("res.partner", string="Origin Contact", required=True)
    destination_ids = fields.Many2many("res.partner", string="Destination Contacts")
    line_ids = fields.One2many("route.wizard.line", "wizard_id", string="Stops")
    final_id = fields.Many2one("res.partner", string="Final Contact")
    optimize = fields.Boolean(string="Optimize Route", default=True)
    departure_time = fields.Datetime(string="Departure Date and Time", default=lambda self: fields.Datetime.now())
    avoid_tolls = fields.Boolean(string="Avoid tolls")
    avoid_highways = fields.Boolean(string="Avoid highways")
    avoid_ferries = fields.Boolean(string="Avoid ferries")
    source_id = fields.Integer(string="Source ID")
    google_url = fields.Char("Google Map URL")
    note = fields.Text(string="General Notes")
    total_duration_seconds = fields.Integer(string="Total Duration (seconds)")

    @api.model
    def default_get(self, fields_list):
        res = super().default_get(fields_list)
        line_cmds = []
        history_id = res.get("history_id") or self.env.context.get("default_history_id")
        if history_id:
            history = self.env["route.history"].browse(history_id)
            for idx, line in enumerate(history.line_ids.sorted(key=lambda l: (l.sequence, l.id)), start=1):
                line_cmds.append((0, 0, {
                    "sequence": idx * 10,
                    "partner_id": line.partner_id.id,
                    "note": line.note,
                    "leg_duration_seconds": line.leg_duration_seconds,
                }))
            res["note"] = history.note
            res["total_duration_seconds"] = history.total_duration_seconds
        else:
            active_model = self.env.context.get("active_model")
            active_ids = self.env.context.get("active_ids", [])
            partners = self.env["res.partner"]
            if active_model == "res.partner":
                partners = self.env["res.partner"].browse(active_ids)
            elif active_model == "sale.order":
                partners = self.env["sale.order"].browse(active_ids).mapped("partner_id")
            elif active_model == "purchase.order":
                partners = self.env["purchase.order"].browse(active_ids).mapped("partner_id")
            if partners:
                unique_partners = partners.exists()
                for idx, partner in enumerate(unique_partners, start=1):
                    line_cmds.append((0, 0, {"sequence": idx * 10, "partner_id": partner.id}))
        if line_cmds:
            res["line_ids"] = line_cmds
        return res

    def _partner_to_point(self, partner, label="contacto"):
        if not partner:
            return None
        if partner.partner_latitude in (False, None) or partner.partner_longitude in (False, None):
            raise UserError(_("El %s '%s' no tiene coordenadas geográficas.") % (label, partner.display_name))
        return {"lat": float(partner.partner_latitude), "lon": float(partner.partner_longitude), "id": partner.id, "name": partner.display_name}

    def _safe_departure_time(self):
        self.ensure_one()
        now_dt = fields.Datetime.now()
        departure = self.departure_time or now_dt
        if departure <= now_dt:
            departure = now_dt + timedelta(minutes=5)
            self.departure_time = departure
        return departure

    def _build_google_maps_url(self, route):
        self.ensure_one()
        if not route or len(route) < 2:
            raise ValidationError(_("La ruta generada no tiene suficientes puntos para abrir Google Maps."))
        origin = route[0]
        destination = route[-1]
        middle_points = route[1:-1]
        params = {
            "api": 1,
            "travelmode": "driving",
            "origin": f"{origin['lat']},{origin['lon']}",
            "destination": f"{destination['lat']},{destination['lon']}",
        }
        if middle_points:
            params["waypoints"] = "|".join(f"{p['lat']},{p['lon']}" for p in middle_points)
        avoid_values = []
        if self.avoid_tolls:
            avoid_values.append("tolls")
        if self.avoid_highways:
            avoid_values.append("highways")
        if self.avoid_ferries:
            avoid_values.append("ferries")
        if avoid_values:
            params["avoid"] = ",".join(avoid_values)
        return "https://www.google.com/maps/dir/?" + urlencode(params, safe="|,")

    def action_generate_route(self):
        self.ensure_one()
        if not self.origin_id or not self.line_ids:
            raise ValidationError(_("Debes seleccionar origen y al menos un destino."))
        origin = self._partner_to_point(self.origin_id, "origen")
        ordered_lines = self.line_ids.sorted(key=lambda l: (l.sequence, l.id))
        final = self._partner_to_point(self.final_id, "destino final") if self.final_id else None
        dests = []
        for line in ordered_lines:
            if self.final_id and line.partner_id.id == self.final_id.id:
                continue
            dests.append(self._partner_to_point(line.partner_id, "destino"))
        route_modifiers = {
            "avoidTolls": bool(self.avoid_tolls),
            "avoidHighways": bool(self.avoid_highways),
            "avoidFerries": bool(self.avoid_ferries),
        }
        safe_departure = self._safe_departure_time()
        route_data = self.env["tsp.service"].solve_tsp(
            origin=origin,
            destinations=dests,
            end=final,
            route_modifiers=route_modifiers,
            departure_time=safe_departure,
            optimize_waypoint_order=self.optimize,
        )
        route = route_data.get("route", [])
        ordered_ids = [p["id"] for p in route if p.get("id")]
        url = self._build_google_maps_url(route)
        self.write({
            "destination_ids": [(6, 0, ordered_ids)],
            "google_url": url,
            "total_duration_seconds": route_data.get("total_duration_seconds", 0),
        })
        leg_map = route_data.get("leg_seconds_by_id", {})
        seq_map = {pid: idx * 10 for idx, pid in enumerate(ordered_ids, start=1)}
        for line in self.line_ids:
            if line.partner_id.id in seq_map:
                line.sequence = seq_map[line.partner_id.id]
                line.leg_duration_seconds = int(leg_map.get(line.partner_id.id, 0))
        return {"type": "ir.actions.act_url", "url": url, "target": "new"}

    def action_save_route(self):
        self.ensure_one()
        if not self.google_url:
            raise ValidationError(_("You must generate the map search at least once to save."))
        ordered_lines = self.line_ids.sorted(key=lambda l: (l.sequence, l.id))
        ordered_partner_ids = ordered_lines.mapped("partner_id").ids
        line_commands = [(5, 0, 0)] + [
            (0, 0, {
                "sequence": line.sequence,
                "partner_id": line.partner_id.id,
                "note": line.note,
                "leg_duration_seconds": line.leg_duration_seconds,
            })
            for line in ordered_lines
        ]
        now_utc = fields.Datetime.now()
        now_local = fields.Datetime.context_timestamp(self, now_utc)
        name_value = self.name or _("Route from %s (%s)") % (
            self.origin_id.name,
            now_local.strftime("%Y-%m-%d %H:%M"),
        )
        vals = {
            "name": name_value,
            "origin_id": self.origin_id.id,
            "destination_ids": [(6, 0, ordered_partner_ids)],
            "line_ids": line_commands,
            "google_url": self.google_url,
            "optimize": self.optimize,
            "final_id": self.final_id.id if self.final_id else False,
            "departure_time": self.departure_time,
            "avoid_tolls": self.avoid_tolls,
            "avoid_highways": self.avoid_highways,
            "avoid_ferries": self.avoid_ferries,
            "note": self.note,
            "total_duration_seconds": self.total_duration_seconds,
        }
        if self.history_id:
            self.history_id.write(vals)
        else:
            self.env["route.history"].create(vals)
        return {"type": "ir.actions.client", "tag": "reload"}


class RouteWizardLine(models.TransientModel):
    _name = "route.wizard.line"
    _description = "Route Wizard Stop"
    _order = "sequence, id"

    wizard_id = fields.Many2one("route.wizard", string="Wizard", required=True, ondelete="cascade")
    sequence = fields.Integer(default=10)
    partner_id = fields.Many2one("res.partner", string="Stop", required=True)
    note = fields.Char(string="Stop Note")
    leg_duration_seconds = fields.Integer(string="Time from previous point (seconds)")
