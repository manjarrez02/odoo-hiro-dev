from odoo import api, models


class PosSession(models.Model):
    _inherit = 'pos.session'


    def _loader_params_res_users(self):
        result = super()._loader_params_res_users()
        result['search_params']['fields'].append('pos_session_access_close')
        return result
