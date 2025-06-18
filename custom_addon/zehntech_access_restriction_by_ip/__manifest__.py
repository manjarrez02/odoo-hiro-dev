{
    'name': 'Access Restriction By IP',
    'description': """The Access Restriction by IP app enhances the security of your Odoo system by allowing administrators to restrict user access based on IP addresses""",
    'summary': """The Access Restriction by IP Odoo app allows administrators to define allowed and blocked IP ranges, enhancing system security by controlling user access based on their location.""",
    'version': '16.0.1.0.0',
    "category": "Tools",
    "author": "Zehntech Technologies Inc.",
    "company": "Zehntech Technologies Inc.",
    "maintainer": "Zehntech Technologies Inc.",
    "contributor": "Zehntech Technologies Inc.",
    "website": "https://www.zehntech.com/",
    "support": "odoo-support@zehntech.com",
    'depends': ['mail'],
    'data': [
          'security/access_groups.xml',
          'security/ir.model.access.csv',
          'data/email_templates.xml',
          'data/demo_user.xml',
          'views/allowed_ips_view.xml',
          'views/unauthorized_access_log_views.xml',
          'views/view_res_config_settings.xml'
    ],
    "images": ['static/description/banner.png'],
    "license": "OPL-1",
    "installable": True,
    "application": True,
    "auto_install": False,
    "price": 00.00,
    "currency": "USD"
}






