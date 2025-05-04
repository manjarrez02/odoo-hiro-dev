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


class PosConfig(models.Model):
    _inherit = "pos.config"

    customer_display = fields.Boolean("Customer Display")
    enable_signature = fields.Boolean("Enable Signature")
    image_interval = fields.Integer("Image Interval", default=10)
    customer_display_details_ids = fields.One2many('customer.display', 'config_id', 
        string="Customer Display Details")
    ad_video_ids = fields.One2many('ad.video', 'config_id', string="Advertise Video Id (YouTube)")
    enable_customer_rating = fields.Boolean("Customer Display Rating")
    set_customer = fields.Boolean("Set Customer")
    create_customer = fields.Boolean("Create Customer")

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4: