# -*- coding: utf-8 -*-

from odoo import api, models
from lxml import etree
import ast
from odoo.http import request


class BaseModel(models.AbstractModel):
    _inherit = 'base'

    @api.model
    def get_views(self, views, options=None):
        """If any button is invisible inside """
        view_ref = super(BaseModel, self).get_views(views, options)
        lst = [int(x) for x in request.httprequest.cookies.get('cids').split(',')]
        if view_ref.get('views'):
            actions_and_reports = []
            hidden_obj = self.env['model.access'].sudo().search(
                [('ks_user_management_id', 'in', self.env.user.ks_user_management_id.ids),
                 ('ks_model_id.model', '=', self._name),
                 ('ks_user_management_id.ks_company_ids', 'in', lst)])
            for access in hidden_obj:
                actions_and_reports += access.mapped('ks_report_action_ids.ks_action_id').ids
                actions_and_reports += access.mapped('ks_server_action_ids.ks_action_id').ids
            if hidden_obj:
                for view in ['list', 'form']:
                    view_obj = view_ref['views'].get(view)
                    if view_obj:
                        toolbar_obj = view_obj.get('toolbar',{})
                        print_obj = toolbar_obj.get('print',{})
                        action_obj = toolbar_obj.get('action',{})
                        if toolbar_obj and print_obj:
                            for print in print_obj:
                                if print['id'] in actions_and_reports:
                                    print_obj.remove(print)
                        if toolbar_obj and action_obj:
                            for action in action_obj:
                                if action['id'] in actions_and_reports:
                                    action_obj.remove(action)
        return view_ref

    @api.model
    def get_view(self, view_id=None, view_type='form', **options):
        view_ref = super().get_view(view_id, view_type, **options)
        doc = etree.XML(view_ref['arch'])
        lst = [int(x) for x in request.httprequest.cookies.get('cids').split(',')]
        if view_type == 'form':
            # remove external link
            hide_field_access = self.env['field.access'].sudo().search([
                ('ks_user_management_id.ks_user_ids', 'in', self.env.user.id),
                ('ks_user_management_id.active', '=', True),
                ('ks_model_id.model', '=', view_ref['model']), ('ks_field_external_link', '=', True),
                ('ks_user_management_id.ks_company_ids', 'in', lst)])
            if hide_field_access:
                for field in hide_field_access.mapped('ks_field_id'):
                    if field.ttype in ['many2many', 'many2one']:
                        for field_ele in doc.xpath("//field[@name='" + field.name + "']"):
                            options = 'options' in field_ele.attrib.keys() and field_ele.attrib['options'] or "{}"
                            options = ast.literal_eval(options)
                            options.update({'no_create': True, 'no_create_edit': True, 'no_open': True})
                            field_ele.attrib.update({'options': str(options)})
                view_ref['arch'] = etree.tostring(doc, encoding='unicode')

            # Hide All Chatter
            if self.env['user.management'].sudo().search(
                    [('active', '=', True), ('ks_user_ids', 'in', self.env.user.id),
                     ('ks_company_ids', 'in', lst), ('ks_hide_chatter', '=', True)], limit=1).id:
                for div in doc.xpath("//div[@class='oe_chatter']"):
                    div.getparent().remove(div)
                view_ref['arch'] = etree.tostring(doc, encoding='unicode')
        if view_type == 'kanban':
            hide_button_ids = self.env['button.tab.access'].sudo().search([
                ('ks_model_id.model', '=', view_ref['model']), ('ks_user_management_id.active', '=', True),
                ('ks_user_management_id.ks_user_ids', 'in', self._uid),
                ('ks_user_management_id.ks_company_ids', 'in', lst)])
            for button in hide_button_ids:
                for btn in button.ks_hide_button_ids:
                    element = doc.xpath(f"//a[@name='{btn.ks_name}']")
                    for ele in element:
                        # if not ele.text.startswith('\n'):
                        ele.attrib.update({'class': 'd-none'})
                    element = doc.xpath(f"//button[@name='{btn.ks_name}']")
                    for ele in element:
                        # if not ele.text.startswith('\n'):
                        ele.attrib.update({'class': 'd-none'})
                    element = doc.xpath(f"//object[@name='{btn.ks_name}']")
                    for ele in element:
                        # if not ele.text.startswith('\n'):
                        ele.attrib.update({'class': 'd-none'})
                for link in button.ks_kanban_button_ids:
                    if link.ks_button_type == 'edit':
                        element = doc.xpath("//a[@type='edit']")
                    elif link.ks_button_type == 'set_cover':
                        element = doc.xpath("//a[@type='set_cover']")
                    else:
                        element = doc.xpath(f"//a[@name='{link.ks_name}']")
                    for ele in element:
                        if (not ele.text.startswith(
                                '\n') and ele.text == link.ks_tab_button_string) or ele.text.startswith('\n'):
                            ele.attrib.update({'class': 'd-none'})
                for link in button.ks_kanban_button_ids:
                    element = doc.xpath(f"//button[@name='{link.ks_name}']")
                    for ele in element:
                        # if not ele.text.startswith('\n'):
                        ele.attrib.update({'class': 'd-none'})
            view_ref['arch'] = etree.tostring(doc, encoding='unicode')
        # Make whole system readonly
        readonly_access_id = self.env['user.management'].sudo().search(
            [('active', '=', True), ('ks_user_ids', 'in', self.env.user.id),
             ('ks_readonly', '=', True), ('ks_company_ids', 'in', lst)])
        if readonly_access_id:
            doc.attrib.update({'create': 'false', 'delete': 'false', 'edit': 'false', 'duplicate': 'false'})
            view_ref['arch'] = etree.tostring(doc, encoding='unicode').replace('&amp;quot;', '&quot;')
        else:
            # Change model access like :- Create, Update , Delete etc.
            change_model_access = self.env['model.access'].sudo().search([
                ('ks_user_management_id.ks_user_ids', 'in', self.env.user.id),
                ('ks_user_management_id.active', '=', True),
                ('ks_model_id.model', '=', view_ref['model']), ('ks_user_management_id.ks_company_ids', 'in', lst)])
            if change_model_access:
                delete = 'true'
                edit = 'true'
                create = 'true'
                duplicate = 'true'
                for remove_action_ids in change_model_access:
                    if remove_action_ids.ks_hide_create:
                        create = 'false'
                    if remove_action_ids.ks_hide_edit:
                        edit = 'false'
                    if remove_action_ids.ks_hide_delete:
                        delete = 'false'
                    if remove_action_ids.ks_hide_duplicate:
                        duplicate = 'false'
                    if remove_action_ids.ks_model_readonly:
                        create, delete, edit = 'false', 'false', 'false'
                doc.attrib.update(
                    {'create': create, 'delete': delete, 'edit': edit, 'duplicate': duplicate})
                view_ref['arch'] = etree.tostring(doc, encoding='unicode')
        return view_ref
