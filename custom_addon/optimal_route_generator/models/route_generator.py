# -*- coding: utf-8 -*-
import logging
import requests

from odoo import _, models, fields
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class TspService(models.AbstractModel):
    _name = "tsp.service"
    _description = "TSP Optimization Service"

    GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
    GOOGLE_FIELD_MASK = (
        "routes.optimizedIntermediateWaypointIndex,"
        "routes.distanceMeters,"
        "routes.duration,"
        "routes.legs.distanceMeters,"
        "routes.legs.duration"
    )

    def _get_google_api_key(self):
        param_name = "odoo-google-map-locator-v16.api_key"
        api_key = self.env["ir.config_parameter"].sudo().get_param(param_name)
        if not api_key:
            raise UserError(_("No se encontró la API key de Google Maps. Configúrala en ir.config_parameter con la llave '%s'.") % param_name)
        return api_key

    def _validate_point(self, point, label="punto"):
        if not isinstance(point, dict):
            raise UserError(_("El %s debe ser un dict.") % label)
        if "lat" not in point or "lon" not in point:
            raise UserError(_("El %s debe incluir 'lat' y 'lon'.") % label)
        try:
            lat = float(point["lat"])
            lon = float(point["lon"])
        except (TypeError, ValueError):
            raise UserError(_("El %s tiene coordenadas inválidas.") % label)
        if lat < -90 or lat > 90 or lon < -180 or lon > 180:
            raise UserError(_("El %s tiene coordenadas fuera de rango.") % label)
        return {"lat": lat, "lon": lon, **point}

    def _same_point(self, a, b):
        if not a or not b:
            return False
        if a.get("id") and b.get("id"):
            return a["id"] == b["id"]
        return float(a.get("lat", 0)) == float(b.get("lat", 0)) and float(a.get("lon", 0)) == float(b.get("lon", 0))

    def _build_waypoint(self, point):
        return {
            "location": {
                "latLng": {
                    "latitude": float(point["lat"]),
                    "longitude": float(point["lon"]),
                }
            }
        }

    def _deduplicate_points(self, points):
        unique = []
        for p in points:
            if not any(self._same_point(p, existing) for existing in unique):
                unique.append(p)
        return unique

    def _build_route_modifiers(self, route_modifiers=None):
        route_modifiers = route_modifiers or {}
        return {
            "avoidTolls": bool(route_modifiers.get("avoidTolls")),
            "avoidHighways": bool(route_modifiers.get("avoidHighways")),
            "avoidFerries": bool(route_modifiers.get("avoidFerries")),
        }

    def _format_departure_time(self, departure_time):
        if not departure_time:
            return None
        if isinstance(departure_time, str):
            departure_time = fields.Datetime.from_string(departure_time)
        if not departure_time:
            return None
        return departure_time.strftime("%Y-%m-%dT%H:%M:%SZ")

    def _parse_google_duration_to_seconds(self, value):
        if not value:
            return 0
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str) and value.endswith("s"):
            try:
                return int(float(value[:-1]))
            except ValueError:
                return 0
        return 0

    def _google_optimize_order(self, origin, destinations, end=None, route_modifiers=None, departure_time=None, optimize_waypoint_order=True):
        api_key = self._get_google_api_key()
        if not destinations:
            return {"optimized": [], "total_duration_seconds": 0, "leg_durations": []}
        destination = end or origin
        formatted_departure_time = self._format_departure_time(departure_time)
        body = {
            "origin": self._build_waypoint(origin),
            "destination": self._build_waypoint(destination),
            "intermediates": [self._build_waypoint(p) for p in destinations],
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE",
            "optimizeWaypointOrder": bool(optimize_waypoint_order),
            "languageCode": "es-MX",
            "units": "METRIC",
            "routeModifiers": self._build_route_modifiers(route_modifiers),
        }
        if formatted_departure_time:
            body["departureTime"] = formatted_departure_time
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": self.GOOGLE_FIELD_MASK,
        }
        try:
            _logger.warning("Google Routes request body: %s", body)
            response = requests.post(self.GOOGLE_ROUTES_URL, headers=headers, json=body, timeout=20)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            _logger.exception("Error consultando Google Routes API")
            raise UserError(_("No fue posible consultar Google Routes API para optimizar la ruta: %s") % str(exc))
        routes = data.get("routes") or []
        if not routes:
            raise UserError(_("Google Routes API no devolvió rutas."))
        route0 = routes[0]
        optimized_idx = route0.get("optimizedIntermediateWaypointIndex")
        if optimized_idx is None:
            optimized = destinations
        else:
            try:
                optimized = [destinations[i] for i in optimized_idx]
            except (IndexError, TypeError):
                _logger.exception("Índices inválidos devueltos por Google")
                raise UserError(_("Google devolvió un orden de waypoints inválido."))
        total_duration_seconds = self._parse_google_duration_to_seconds(route0.get("duration"))
        leg_durations = [self._parse_google_duration_to_seconds(leg.get("duration")) for leg in (route0.get("legs") or [])]
        return {
            "optimized": optimized,
            "total_duration_seconds": total_duration_seconds,
            "leg_durations": leg_durations,
        }

    def solve_tsp(self, origin, destinations, end=None, route_modifiers=None, departure_time=None, optimize_waypoint_order=True):
        origin = self._validate_point(origin, "origen")
        end = self._validate_point(end, "destino final") if end else None
        dests = [self._validate_point(d, "destino") for d in (destinations or [])]
        dests = self._deduplicate_points(dests)
        dests = [d for d in dests if not self._same_point(d, origin)]
        if end:
            dests = [d for d in dests if not self._same_point(d, end)]
        if not dests:
            route = [origin]
            if end:
                route.append(end)
            return {"route": route, "total_duration_seconds": 0, "leg_seconds_by_id": {}}
        if len(dests) > 25:
            raise UserError(_("Google Routes API permite hasta 25 paradas intermedias en este flujo. Recibidas: %s") % len(dests))
        optimization = self._google_optimize_order(origin, dests, end=end, route_modifiers=route_modifiers, departure_time=departure_time, optimize_waypoint_order=optimize_waypoint_order)
        optimized_dests = optimization.get("optimized", [])
        route = [origin] + optimized_dests
        if end:
            route.append(end)
        leg_durations = optimization.get("leg_durations", [])
        leg_seconds_by_id = {}
        ordered_stops = optimized_dests + ([end] if end else [])
        for idx, point in enumerate(ordered_stops):
            if point and point.get("id"):
                leg_seconds_by_id[point["id"]] = leg_durations[idx] if idx < len(leg_durations) else 0
        return {
            "route": route,
            "total_duration_seconds": optimization.get("total_duration_seconds", 0),
            "leg_seconds_by_id": leg_seconds_by_id,
        }
