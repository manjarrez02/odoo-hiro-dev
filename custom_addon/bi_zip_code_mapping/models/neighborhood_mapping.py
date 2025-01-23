# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api

class NeighborhoodMapping(models.Model):
	_name = 'neighborhood.mapping'
	_description = "Neighborhood Mapping"

	name = fields.Char(string='Neighborhood', required=True)