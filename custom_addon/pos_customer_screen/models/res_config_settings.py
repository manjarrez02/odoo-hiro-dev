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


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pos_customer_display = fields.Boolean('Customer Display', related='pos_config_id.customer_display', readonly=False)
    pos_enable_signature = fields.Boolean('Enable Signature', related='pos_config_id.enable_signature', readonly=False)
    pos_image_interval = fields.Integer('Image Interval', related='pos_config_id.image_interval', readonly=False)
    pos_customer_display_details_ids = fields.One2many(string='Customer Display Details', related='pos_config_id.customer_display_details_ids', readonly=False)
    pos_ad_video_ids = fields.One2many(string='Advertise Video Id (YouTube)', related='pos_config_id.ad_video_ids', readonly=False)
    pos_enable_customer_rating = fields.Boolean('Customer Display Rating', related='pos_config_id.enable_customer_rating', readonly=False)
    pos_set_customer = fields.Boolean('Set Customer', related='pos_config_id.set_customer', readonly=False)
    pos_create_customer = fields.Boolean('Create Customer', related='pos_config_id.create_customer', readonly=False)


# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4: