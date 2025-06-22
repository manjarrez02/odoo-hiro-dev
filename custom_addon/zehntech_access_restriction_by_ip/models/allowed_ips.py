from odoo import models, fields, api
import ipaddress
from odoo.exceptions import ValidationError, AccessDenied
from odoo import _, exceptions


class ResUsersInherit(models.Model):
    _inherit = "res.users"

    allowed_ips = fields.One2many("allowed.ips", "users_ip", string="Allowed IPs",help="Specify the list of IPs allowed for user access.")

    @api.model
    def create(self, vals):
        if not self.env.user.has_group("base.group_system"):
            raise exceptions.AccessError("You do not have permission to Create User.")
        return super(ResUsersInherit, self).create(vals)

"""
    @api.constrains("groups_id")
    def _check_required_groups(self):
        for user in self:
            access_groups = ["Access User", "Access Manager"]
            rights_groups = ["Access Rights", "Settings"]

            user_group_names = [group.name for group in user.groups_id]

            access_group_selected = any(
                group in user_group_names for group in access_groups
            )

            rights_group_selected = any(
                group in user_group_names for group in rights_groups
            )

            if (
                "Access Manager" in user_group_names
                and "Settings" not in user_group_names
            ):
                raise ValidationError(
                    "'Access Manager' must be paired with 'Settings'."
                )

            if (
                "Settings" in user_group_names
                and "Access Manager" not in user_group_names
            ):
                raise ValidationError("'Settings' must have 'Access Manager' group")

            if (
                "Access User" in user_group_names
                and "Access Rights" not in user_group_names
            ):
                raise ValidationError("'Access User' must have  'Access Rights' group")

            if (
                "Access Rights" in user_group_names
                and "Access User" not in user_group_names
            ):
                raise ValidationError(
                    "'Access Rights' must be paired with 'Access User'."
                )

            if not access_group_selected:
                raise ValidationError(
                    "Each user must belong to at least one of the required groups:\n"
                    "1. Either 'Access User' or 'Access Manager'.\n"
                    "2. Either 'Access Rights' or 'Settings'."
                )

            if not rights_group_selected:
                raise ValidationError(
                    "Each user must belong to at least one of the required groups:\n"
                    "1. Either 'Access User' or 'Access Manager'.\n"
                    "2. Either 'Access Rights' or 'Settings'."
                )
"""

class AllowedIPs(models.Model):
    _name = "allowed.ips"

    users_ip = fields.Many2one("res.users", string="User", help="Select the user for whom the IP access is being configured.")
    ip_range_start = fields.Char(string="Starting IP Address",help="Specify the starting IP address of the range.")
    ip_range_end = fields.Char(string="Ending IP Address",help="Specify the ending IP address of the range.")

    @api.constrains("ip_range_start", "ip_range_end")
    def _check_ip_format(self):
        for record in self:
            if (record.ip_range_start and not record.ip_range_end) or (
                not record.ip_range_start and record.ip_range_end
            ):
                raise ValidationError(
                    _(
                        "Both 'IP Range Start' and 'IP Range End' must be provided together."
                    )
                )
            
            if not record.ip_range_start and not record.ip_range_end:
             continue


            try:
                if record.ip_range_start:
                   start_ip = ipaddress.ip_address(record.ip_range_start)
                if record.ip_range_end:
                    end_ip = ipaddress.ip_address(record.ip_range_end)
            except ValueError:
                raise ValidationError(
                    _("IP addresses must be valid IPv4 or IPv6 addresses.")
                )
            
            if start_ip == end_ip:
                raise ValidationError(
                    _("Starting and Ending range of IP address must be different.")
                )

            if start_ip > end_ip:
                raise ValidationError(
                    _("Ending range of IP address must be greater than starting IP address.")
                )