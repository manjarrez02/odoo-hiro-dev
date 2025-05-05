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

from odoo import http
from odoo.http import request
from odoo.addons.bus.controllers.main import BusController
import logging
_logger = logging.getLogger(__name__)

class CustomerDisplayController(BusController):
    def _poll(self, dbname, channels, last, options):
        """Add the relevant channels to the BusController polling."""
        if options.get('customer.display'):
            channels = list(channels)
            ticket_channel = (
                request.db,
                'customer.display',
                options.get('customer.display')
            )
            channels.append(ticket_channel)

        return super(CustomerDisplayController, self)._poll(dbname, channels, last, options)


class PosMirrorController(http.Controller):

    @http.route('/web/customer_display', type='http', auth='user')
    def white_board_web_1(self, **k):
        config_id = False
        pos_sessions = request.env['pos.session'].sudo().search([
            ('state', '=', 'opened'),            
            ('rescue', '=', False)]) #Se elimina la condición ('user_id', '=', request.session.uid) para uso de multiples usuarios 
        if pos_sessions:
            for pos_session in pos_sessions:
                if pos_session.config_id.id == int(k.get('config_id')):
                    config_id = pos_session.config_id.id
        session_info = request.env['ir.http'].session_info()
        context = {
            'session_info': session_info,
            'config_id': config_id,
        }

        _logger.debug("[CUSTOMER DISPLAY] Sesiones POS encontradas: %s", pos_sessions)
        _logger.debug("[CUSTOMER DISPLAY] Contexto enviado al render: %s", context)

        return request.render('pos_customer_screen.index', qcontext=context)

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
