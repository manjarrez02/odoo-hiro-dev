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
    @http.route('/web/login')
    def web_login(self, *args, **kw):
        redirect = None
        ensure_db()
        request.params['login_success'] = False

        if request.httprequest.method == 'GET' and redirect and request.session.uid:
            return request.redirect(redirect)

        if not request.uid:
            request.update_env(user=odoo.SUPERUSER_ID)

        values = {k: v for k, v in request.params.items() if k in SIGN_UP_REQUEST_PARAMS}
        try:
            values['databases'] = http.db_list()
        except odoo.exceptions.AccessDenied:
            values['databases'] = None

        if request.httprequest.method == 'POST':
            ip_address = request.httprequest.remote_addr
            _logger.info("Login attempt from IP: %s", ip_address)
            try:
                user = request.env['res.users'].sudo().search([('login', '=', request.params['login'])])

                # Verificación de IP
                if user and user.allowed_ips:
                    ip_allowed = False
                    try:
                        ip = ipaddress.ip_address(ip_address)
                        for rec in user.allowed_ips:
                            if rec.ip_range_start and rec.ip_range_end:
                                start_ip = ipaddress.ip_address(rec.ip_range_start)
                                end_ip = ipaddress.ip_address(rec.ip_range_end)
                                if start_ip <= ip <= end_ip:
                                    ip_allowed = True
                                    break
                    except ValueError as e:
                        _logger.error("Invalid IP format or range: %s", e)

                    if not ip_allowed:
                        notification_enabled = (
                            request.env["ir.config_parameter"]
                            .sudo()
                            .get_param("unauthorized_notification_enabled", default=False)
                        )
                        if notification_enabled:
                            self._send_blocked_login_email(user, ip_address)
                        self._log_login_attempt(user, ip_address, request.params["login"], False)
                        values["error"] = _(
                            "Not allowed to login from this IP. Please contact your administrator."
                        )
                        return request.render("web.login", values)

                # Validación de contraseña y grupos
                login = True
                if user and not user.has_group('base.group_system') and user.ks_is_passwd_expired:
                    values['error'] = _("Password Expired")
                    login = False
                elif user and not user.groups_id and not user.has_group('base.group_system'):
                    values['error'] = _("This database is not allowed, Please contact your Admin to activate this database")
                    login = False

                if login:
                    uid = request.session.authenticate(request.db, request.params['login'], request.params['password'])
                    request.params['login_success'] = True
                    return request.redirect(self._login_redirect(uid, redirect=redirect))

            except odoo.exceptions.AccessDenied as e:
                if e.args == odoo.exceptions.AccessDenied().args:
                    values['error'] = _("Wrong login/password")
                else:
                    values['error'] = e.args[0]

        else:
            if 'error' in request.params and request.params.get('error') == 'access':
                values['error'] = _('Only employees can access this database. Please contact the administrator.')

        if 'login' not in values and request.session.get('auth_login'):
            values['login'] = request.session.get('auth_login')

        if not odoo.tools.config['list_db']:
            values['disable_database_manager'] = True

        response = request.render('web.login', values)
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Content-Security-Policy'] = "frame-ancestors 'self'"

        module = request.env['ir.module.module'].sudo().search([
            ('name', '=', 'auth_oauth'),
            ('state', '=', 'installed')
        ], limit=1)

        response.qcontext.update(self.get_auth_signup_config())

        if request.session.uid:
            if request.httprequest.method == 'GET' and request.params.get('redirect'):
                return request.redirect(request.params.get('redirect'))
            if response.location == '/web/login_successful' and kw.get('confirm_password'):
                return request.redirect_query('/web/login_successful', query={'account_created': True})

        if request.httprequest.method == 'GET' and request.session.uid and request.params.get('redirect'):
            return request.redirect(request.params.get('redirect'))

        if module:
            providers = self.list_providers()
            if response.is_qweb:
                error = request.params.get('oauth_error')
                if error == '1':
                    error = _("Sign up is not allowed on this database.")
                elif error == '2':
                    error = _("Access Denied")
                elif error == '3':
                    error = _(
                        "You do not have access to this database or your invitation has expired. "
                        "Please ask for an invitation and be sure to follow the link in your invitation email."
                    )
                else:
                    error = None

                response.qcontext['providers'] = providers
                if error:
                    response.qcontext['error'] = error

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
