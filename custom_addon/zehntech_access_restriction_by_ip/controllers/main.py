from odoo.addons.web.controllers import home
from odoo.http import request
from odoo import http, fields, models, _
import odoo
import odoo.modules.registry
from odoo.exceptions import AccessDenied
from odoo.addons.web.controllers.utils import ensure_db
import ipaddress
import logging
from datetime import datetime
from odoo.addons.web.controllers.home import Home


_logger = logging.getLogger(__name__)

SIGN_UP_REQUEST_PARAMS = {
    "db",
    "login",
    "debug",
    "token",
    "message",
    "error",
    "scope",
    "mode",
    "redirect",
    "redirect_hostname",
    "email",
    "name",
    "partner_id",
    "password",
    "confirm_password",
    "city",
    "country_id",
    "lang",
    "signup_email",
}


class HomeCustom(Home):
    @http.route("/web/login", type="http", auth="none")
    def web_login(self, redirect=None, **kw):
        ensure_db()
        request.params["login_success"] = False

        if request.httprequest.method == "GET" and redirect and request.session.uid:
            return request.redirect(redirect)

        if request.env.uid is None:
            if request.session.uid is None:
                request.env["ir.http"]._auth_method_public()
            else:
                request.update_env(user=request.session.uid)

        values = {
            k: v for k, v in request.params.items() if k in SIGN_UP_REQUEST_PARAMS
        }
        try:
            values["databases"] = http.db_list()
        except AccessDenied:
            values["databases"] = None

        if request.httprequest.method == "POST":
            old_uid = request.uid
            ip_address = request.httprequest.environ["REMOTE_ADDR"]
            _logger.info("Login attempt from IP: %s", ip_address)

            if request.params["login"]:
                user_rec = (
                    request.env["res.users"]
                    .sudo()
                    .search([("login", "=", request.params["login"])])
                )

                if user_rec.allowed_ips:
                    ip_allowed = False
                    try:
                        ip = ipaddress.ip_address(ip_address)
                        for rec in user_rec.allowed_ips:
                            if rec.ip_range_start and rec.ip_range_end:
                                try:
                                    if ":" in rec.ip_range_start:
                                        start_ip = ipaddress.IPv6Address(
                                            rec.ip_range_start
                                        )
                                        end_ip = ipaddress.IPv6Address(rec.ip_range_end)
                                    else:
                                        start_ip = ipaddress.IPv4Address(
                                            rec.ip_range_start
                                        )
                                        end_ip = ipaddress.IPv4Address(rec.ip_range_end)

                                    if isinstance(
                                        ip, ipaddress.IPv6Address
                                    ) and isinstance(start_ip, ipaddress.IPv6Address):
                                        if start_ip <= ip <= end_ip:
                                            ip_allowed = True
                                            break
                                    elif isinstance(
                                        ip, ipaddress.IPv4Address
                                    ) and isinstance(start_ip, ipaddress.IPv4Address):
                                        if start_ip <= ip <= end_ip:
                                            ip_allowed = True
                                            break
                                    else:
                                        _logger.warning(
                                            "IP type mismatch: IP is %s, Range is %s",
                                            type(ip),
                                            type(start_ip),
                                        )

                                except ValueError as e:
                                    _logger.error("Invalid IP range: %s", e)
                                    ip_allowed = False
                    except ValueError as e:
                        _logger.error("Invalid IP address format: %s", e)
                        ip_allowed = False

                    if not ip_allowed:
                        notification_enabled = (
                            request.env["ir.config_parameter"]
                            .sudo()
                            .get_param(
                                "unauthorized_notification_enabled", default=False
                            )
                        )
                        if notification_enabled:
                            self._send_blocked_login_email(user_rec, ip_address)
                        _logger.warning(
                            "Blocked login attempt for user %s from IP %s",
                            user_rec.login,
                            ip_address,
                        )
                        request.update_env = old_uid
                        values["error"] = _(
                            "Not allowed to login from this IP. Please contact your administrator."
                        )
                        self._log_login_attempt(
                            user_rec, ip_address, request.params["login"], False
                        )
                        return request.render("web.login", values)
                    else:
                        try:
                            uid = request.session.authenticate(
                                request.session.db,
                                request.params["login"],
                                request.params["password"],
                            )
                            request.params["login_success"] = True
                            return request.redirect("/web")
                        except AccessDenied as e:
                            request.update_env = old_uid
                            if e.args == AccessDenied().args:
                                values["error"] = _("Wrong login/password")
                                self._log_login_attempt(
                                    user_rec, ip_address, request.params["login"], False
                                )
                else:
                    try:
                        uid = request.session.authenticate(
                            request.session.db,
                            request.params["login"],
                            request.params["password"],
                        )
                        request.params["login_success"] = True
                        return request.redirect("/web")
                    except AccessDenied as e:
                        request.update_env = old_uid
                        if e.args == AccessDenied().args:
                            values["error"] = _("Wrong login/password")
        else:
            if "error" in request.params and request.params.get("error") == "access":
                values["error"] = _(
                    "Only employees can access this database. Please contact the administrator."
                )

        if "login" not in values and request.session.get("auth_login"):
            values["login"] = request.session.get("auth_login")

        if (
            not request.env["ir.config_parameter"]
            .sudo()
            .get_param("list_db", default=False)
        ):
            values["disable_database_manager"] = True

        response = request.render("web.login", values)
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Content-Security-Policy"] = "frame-ancestors 'self'"
        return response

    def _send_blocked_login_email(self, user_rec, ip_address):
        admin_emails = (
            request.env["res.users"]
            .sudo()
            .search(
                [
                    ("groups_id", "in", [request.env.ref("base.group_system").id]),
                    ("email", "!=", False),
                ]
            )
            .mapped("email")
        )
        if not admin_emails:
            _logger.error("No admin email found to send blocked login notification")
            return

        admin_emails_str = ", ".join(admin_emails)
        _logger.info("Admin emails: %s", admin_emails_str)
        mail_template = request.env.ref(
            "zehntech_access_restriction_by_ip.email_template_blocked_login",
            raise_if_not_found=False,
        )

        if mail_template:
            ctx = {
                "default_model": "res.users",
                "default_res_id": user_rec.id,
                "default_use_template": True,
                "default_template_id": mail_template.id,
                "default_composition_mode": "comment",
                "blocked_ip": ip_address,
                "email_to": admin_emails_str,
                "lang": user_rec.lang or "en_US", 
            }
            _logger.info("Context for email: %s", ctx)
            mail_template.sudo().with_context(ctx).send_mail(
                user_rec.id, force_send=True
            )
        else:
            _logger.error("Email template not found")

    def _log_login_attempt(self, user_rec, ip_address, login, success):
        if not success:
            request.env["unauthorized.access.log"].sudo().create(
                {
                    "user_id": user_rec.id if user_rec else None,
                    "ip_address": ip_address,
                    "attempt_date": datetime.now(),
                }
            )
        _logger.info("Failed login attempt for user: %s from IP: %s", login, ip_address)
