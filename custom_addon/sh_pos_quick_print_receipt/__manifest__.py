# -*- coding: utf-8 -*-
# Part of Softhealer Technologies.

{
    "name" : "POS Quick Print Receipt | Point Of Sale Quick Print Receipt",
    "author" : "Softhealer Technologies",
    "website": "https://www.softhealer.com",
    "support": "support@softhealer.com",
    "license": "OPL-1",
    "category": "Point of Sale",
    "summary": "POS Quick Print Receipt,POS Order Quick Print Receipt,Point Of Sale Order Quick Print Receipt,POS Print Receipt Directly, Point Of Sale Direct Receipt,POS Receipt Print,Point Of Sale Direct Receipt,POS Direct Receipt Odoo",
    "description": """Currently, in odoo, you can print a receipt after payment only, our module help to print POs order receipt before payment also quickly. Only you need to press the "Print Receipt" button. So it will print the receipt directly.""",
    "version":"16.0.1",
    "depends" : ["base", "point_of_sale"],
    "application" : True,
    "data" : [
        
        'views/res_config_settings.xml',
    ],
    'assets': {'point_of_sale.assets': [
                                        'sh_pos_quick_print_receipt/static/src/js/action_button.js',
                                        'sh_pos_quick_print_receipt/static/src/js/Screens/bill_screen.js',
                                        'sh_pos_quick_print_receipt/static/src/xml/action_button.xml',
                                        'sh_pos_quick_print_receipt/static/src/xml/Screens/bill_screen.xml',
                                        ],
               
            },
    'qweb': ['static/src/xml/action_button.xml'],
    "auto_install":False,
    "installable" : True, 
    "images": ["static/description/background.png", ],
    "price": 20,
    "currency": "EUR" 
}
