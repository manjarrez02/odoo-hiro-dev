# -*- coding: utf-8 -*-
from odoo import api, fields, models


class ResPartnerZone(models.Model):
    _name = 'res.partner.zone'
    _description = 'Zona de Contacto / Cliente'
    _order = 'name'

    name = fields.Char(string='Nombre de la zona', required=True, translate=True)
    code = fields.Char(string='Código de zona')
    active = fields.Boolean(string='Activo', default=True)
    description = fields.Text(string='Descripción')
    partner_ids = fields.One2many(
        'res.partner',
        'zone_id',
        string='Contactos / Clientes',
    )
    partner_count = fields.Integer(
        string='Total de contactos',
        compute='_compute_partner_count',
        store=True,
    )

    _sql_constraints = [
        ('name_uniq', 'unique (name)', '¡El nombre de la zona ya existe!'),
    ]

    @api.depends('partner_ids')
    def _compute_partner_count(self):
        for record in self:
            record.partner_count = len(record.partner_ids)
