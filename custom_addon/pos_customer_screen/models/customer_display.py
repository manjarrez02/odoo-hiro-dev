# -*- coding: utf-8 -*-
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################
from odoo import api, fields, models


class CustomerDisplay(models.Model):
    _name = 'customer.display'
    _description = "Customer Display"

    @api.model
    def broadcast_data(self, data):
        uid = self.env.user
        notifications = []
        vals = {
            'user_id': self._uid,
            'orderLines': data.get('orderLines'),
            'total': data.get('total'),
            'tax': data.get('tax'),
            'customer_name': data.get('client_name'),
            'order_total': data.get('order_total'),
            'change_amount': data.get('change_amount'),
            'payment_info': data.get('payment_info'),
            'enable_customer_rating': data.get('enable_customer_rating'),
            'enable_signature': data.get('enable_signature'),
            'set_customer': data.get('set_customer'),
            'config_id': data.get('config_id'),
            'client_uuid': data.get('client_uuid'),
        }
        if data.get('new_order'):
            vals['new_order'] = True
        notifications.append([uid.partner_id, 'customer.display', {'customer_display_data': vals}])
        self.env['bus.bus']._sendmany(notifications)
        return True

    @api.model
    def send_rating(self, config_id, rating_val):
        notifications = []
        session_obj = self.env['pos.session'].search([('config_id', '=', config_id), ('state', '=', 'opened')], limit=1)
        if session_obj:
            notifications.append(
                [session_obj.user_id.partner_id, 'customer.display',
                 {'rating_val': rating_val, 'config_id': config_id}])
            self.env['bus.bus']._sendmany(notifications)
        return True

    @api.model
    def send_signature(self, config_id, sign):
        notifications = []
        session_obj = self.env['pos.session'].search([('config_id', '=', config_id), ('state', '=', 'opened')], limit=1)
        if session_obj:
            notifications.append(
                [session_obj.user_id.partner_id, 'customer.display',
                 {'sign': sign, 'config_id': config_id}])
            self.env['bus.bus']._sendmany(notifications)
        return True

    @api.model
    def create_customer(self, vals, config_id):
        partner = self.env['res.partner'].create({
            'company_type': 'person',
            'name': vals['name'],
            'street': vals['street'],
            'city': vals['city'],
            'zip': vals['zip'],
            'email': vals['email'],
            'phone': vals['phone'],
        })
        if partner:
            notifications = []
            session_obj = self.env['pos.session'].search([('config_id', '=', config_id), ('state', '=', 'opened')],
                                                         limit=1)
            if session_obj:
                notifications.append(
                    [session_obj.user_id.partner_id, 'customer.display',
                     {'partner_id': partner.id, 'config_id': config_id}])
                self.env['bus.bus']._sendmany(notifications)

    @api.model
    def send_data(self, session_id, client_uuid=None):
        session = self.env['pos.session'].browse(session_id)
        config_id = session.config_id.id

        payload = {
            'customer_display_data': {
                'pos_session_id': session_id,
                'config_id': config_id,
                'client_uuid': client_uuid,
            }
        }

        notifications = [[f'pos.config.{config_id}', 'relay.data', payload]]
        self.env['bus.bus']._sendmany(notifications)
        return True


    name = fields.Char("Name")
    image = fields.Binary("Image")
    config_id = fields.Many2one('pos.config', "POS config")


class AdVideo(models.Model):
    _name = 'ad.video'
    _description = "Advertise Video"

    name = fields.Char("Name")
    is_youtube_video = fields.Boolean("YouTube Video")
    video_id = fields.Char("YouTube Video ID")
    local_video_id = fields.Binary("Local Video ID")
    config_id = fields.Many2one('pos.config', "POS config")

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
