from odoo import models, fields, api

class ResConfigSettiongsInhert(models.TransientModel):
    _inherit = "res.config.settings"

    pos_sh_is_quick_receipt_print = fields.Boolean(
        related="pos_config_id.sh_is_quick_receipt_print", readonly=False)
    
