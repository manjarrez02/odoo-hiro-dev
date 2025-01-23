{
    'name': 'POS Close Session User Access',
    'version': '16.0',
    'summary': """User Access to Closing POS, Odoo POS validation,Odoo POS validate, Odoo POS confirmation,
    Odoo POS access, Odoo POS user, user access, POS User Access, access right, POS closing, closing POS, POS session close, 
    pos session access""",
    'description': """POS Session Close Access""",
    'category': 'Sales/Point of Sale',
    'author': "Khaled Hassan",
    'website': "https://apps.odoo.com/apps/modules/browse?search=Khaled+hassan",
    'depends': [
        'point_of_sale',
    ],
    'data': [
        'views/res_users_views.xml',
    ],
    'assets': {
        'point_of_sale.assets': [
            'pos_session_close_access/static/src/js/**/*',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'images': ['static/description/main_screenshot.png'],
    'price': 10,
    'currency': 'EUR',
    'license': 'OPL-1',
}
