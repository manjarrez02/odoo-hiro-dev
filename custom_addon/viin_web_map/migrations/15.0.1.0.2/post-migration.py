from odoo.tools.sql import column_exists


def _drop_mapping_address(cr):
    if column_exists(cr, 'res_partner', 'mapping_address'):
        cr.execute("ALTER TABLE res_partner DROP COLUMN mapping_address;")


def migrate(cr, version):
    _drop_mapping_address(cr)
