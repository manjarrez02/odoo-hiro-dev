# -*- coding: utf-8 -*-
from odoo import fields, models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    zone_id = fields.Many2one(
        'res.partner.zone',
        string='Zona',
        ondelete='set null',
        index=True,
        help='Zona asignada al cliente o contacto.',
    )
