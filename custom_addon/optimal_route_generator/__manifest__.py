# -*- coding: utf-8 -*-
{
    'name': 'All In One Route Map Optimal Route (Sales, Purchase, Contact) - Optimize delivery routes',
    'version': '16.0.0.0.0',
    'category': 'Logistics',
    'sequence': 10,
    'description': """
       Transform your delivery and logistics workflow with this powerful Route Optimization Module for Odoo.
This tool automatically generates the most efficient route from a single origin contact to multiple destination contacts using an advanced Traveling Salesman Problem (TSP) optimization engine.
Instead of visiting locations in an arbitrary or manual order, the module calculates the shortest and most time-efficient path, helping businesses reduce fuel costs, save time, and improve operational planning.
Perfect for companies managing deliveries, field services, pickups, inspections, or any workflow that requires visiting several clients in one trip.
With seamless integration inside Odoo, the module enhances your productivity and ensures smart routing with just one click.
""",
    'summary': """All In One Route Map Optimal Route, Routes, Google Map, Map, Traveling. Google Map. Google Routes. Route Management Route Map, Routing, Transport Generate optimal routes to partners, sales and purchase. 
    Route Optimization for Odoo
Optimize delivery routes
Logistics and delivery planning
Multiple destination contacts
Shortest path calculation
Odoo route planner
Field service route optimization
Smart routing for sales and operations
    """,
    'complexity': 'easy',
    'author': 'KabayGroup',
    'depends': [
        'sale_management',
        'stock',
        'purchase',
    ],
    'data': [
        'groups/group.xml',
        'security/ir.model.access.csv',
        'data/route_sequence.xml',

        'views/route_wizard_view.xml',
        'views/route_button.xml',
        'views/route_history.xml',

        'report/route_paperformat.xml',
        'report/route_history_report.xml',
        'report/route_history_templates.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
    'license': 'OPL-1',
    'images': [
        'static/description/icon.png',
        'static/description/banner.png',
    ],
    'currency': 'USD',
    'price': '30',
    'support': 'info@kabaygroup.com',
}