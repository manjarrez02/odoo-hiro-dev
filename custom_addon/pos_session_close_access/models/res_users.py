from odoo import fields, models


class Users(models.Model):
    _inherit = 'res.users'

    pos_session_access_close = fields.Boolean(string='Access for Closing POS', default=True,
                                      help='Enabling this will allow user to close POS')
