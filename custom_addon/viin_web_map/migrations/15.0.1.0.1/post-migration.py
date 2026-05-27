from odoo import api, SUPERUSER_ID


def _update_cron_method(env):
    ir_cron_fill_coordinates = env.ref('viin_web_map.ir_cron_fill_coordinates', raise_if_not_found=False)
    if ir_cron_fill_coordinates:
        ir_cron_fill_coordinates.write({'code': 'model._cron_fill_coordinates()'})


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    _update_cron_method(env)
