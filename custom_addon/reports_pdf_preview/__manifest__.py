# -*- coding: utf-8 -*-
# Copyright 2024 Pablo Luaces <pablo.luaces@gmail.com>
{
    "name": "PDF Reports Preview",
    "summary": "PDF reports print preview function, configurable on each user",
    "description": """
    With this module the user can decide how want's to open the PDF documents, either to download them directly (Odoo's default option) or to display a modal window with a preview.

    Features
    
    - Print preview for PDF documents
    - Configurable in user preferences
    - View documents in fullscreen mode
    - Multi language, translated to Spanish, Portuguese, German, French, Italian and Russian
    
    Installation
    
    1. Download app, unzip and copy to addons folder.
    2. Restart your Odoo server.
    3. Enable debug mode and click "Update Apps List" button.
    4. Remove "Applications" filter from Apps, search "reports_pdf_preview" and click "Install" button.

    Configuration

    You can enable/disable Reports Preview on user peferences page.
    
    Usage
    
    Simply print a report and the preview window will open if you have it enabled in your user.
    """,
    "version": "1.0",
    "license": "OPL-1",
    "author": "Dezatec",
    "category": "Reporting",
    "website": "https://dezatec.es/odoo",
    "depends": ["web"],
    "data": ["views/res_users.xml"],
    "images": ["static/description/banner.png"],
    "assets": {
        "web.assets_backend": [
            "reports_pdf_preview/static/src/xml/report_viewer.xml",
            "reports_pdf_preview/static/src/scss/preview_dialog.scss",
            "reports_pdf_preview/static/src/js/web_pdf_preview_dialog.js",
            "reports_pdf_preview/static/src/js/web_pdf_preview_handler.js"
        ]
    },
    "installable": True,
    "application": False,
    "price": 22.99,
    "currency": "EUR"
}
