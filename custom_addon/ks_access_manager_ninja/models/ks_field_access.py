# -*- coding: utf-8 -*-
from odoo import fields, models, api, _
from odoo.exceptions import UserError


class KsFieldAccess(models.Model):
    _name = 'field.access'
    _description = 'Field Access'

    ks_model_id = fields.Many2one('ir.model', string='Model', domain="[('id', 'in', ks_profile_domain_model )]")
    ks_field_id = fields.Many2many('ir.model.fields',
                                   string='Field')
    ks_field_invisible = fields.Boolean(string='Invisible')
    ks_field_readonly = fields.Boolean(string='Readonly')
    ks_field_required = fields.Boolean(string='Required')
    ks_field_external_link = fields.Boolean(string='Remove External Link')
    ks_user_management_id = fields.Many2one('user.management', string='Management')
    ks_profile_domain_model = fields.Many2many('ir.model', related='ks_user_management_id.ks_profile_domain_model')

    @api.constrains('ks_field_required', 'ks_field_readonly', 'ks_field_invisible')
    def ks_check_field_access(self):
        for rec in self:
            if (rec.ks_field_required and rec.ks_field_readonly) or (rec.ks_field_required and rec.ks_field_invisible):
                raise UserError(_('You can not set field as Readonly and Required at same time.'))
