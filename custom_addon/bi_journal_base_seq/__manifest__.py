# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

{
	"name" : "Journal Entry Sequence for Invoice",
	"version" : "16.0.0.1",
	"category": "Accounting",
	'summary': 'Odoo14 journal entries sequence odoo14 journal sequence invoice sequence based on journal based sequence for invoice sequence from journal based invoice sequence  separate invoice sequence based on journal separate journal sequence for invoice',
	"description": """
					 In Odoo V14 user are not allowed to create or change journal sequence, This odoo app helps user to create and change journal sequence and refund journal sequence as he/she wants. 
					""",
	"author": "BrowseInfo",
	"website" : "https://www.browseinfo.com",
	"price": 12,
	"currency": 'EUR',
	"depends" : ['base','account'],
	"data": [
		'security/account_journal_security.xml',
		'views/account_journal.xml',
	],
	"auto_install": False,
	"installable": True,
	"live_test_url":'https://youtu.be/Iu-kdaLYA5o',
	"images":['static/description/Banner.gif'],
	'license': 'OPL-1',
}
