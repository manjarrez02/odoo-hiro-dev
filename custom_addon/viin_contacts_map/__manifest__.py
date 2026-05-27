{
    'name': 'Contacts Map',
    'name_vi_VN': 'Bản đồ liên hệ',
    'summary': """Adds notably the map view of contacts""",
    'summary_vi_VN': """Bổ sung chế độ xem bằng bản đồ của liên hệ""",
    'description': """
Demo video: `Contacts Map <https://youtu.be/0mxUczFcUfI>`_

Description
===========
This module helps users easily track the geolocation information of a contact in Contacts app with a specific address and a clear map image, helping locate the exact location when needed.

Key Features
============

* Add geolocation information for an address of partner, customer, etc. contact.
* View the contact's geolocation in map view.

Editions Supported
==================
1. Community Edition
2. Enterprise Edition

    """,

    'description_vi_VN': """
Demo video: `Bản đồ liên hệ <https://youtu.be/0mxUczFcUfI>`_

Mô tả
=====
Mô-đun này giúp người dùng dễ dàng theo dõi thông tin vị trí địa lý của một liên hệ trong ứng dụng Danh bạ với địa chỉ cụ thể, hình ảnh bản đồ rõ ràng, hỗ trợ định vị được vị trí chính xác khi cần.

Tính năng
=========

* Thêm thông tin vị trí địa lý cho một liên hệ đối tác, khách hàng… dựa trên địa chỉ của liên hệ.
* Thêm chế độ xem bản đồ để hiển thị vị trí địa lý của liên hệ.

Ấn bản được Hỗ trợ
==================
1. Ấn bản Community
2. Ấn bản Enterprise

   """,

    'version': '1.0',
    'author': 'Viindoo',
    'website': 'https://viindoo.com/apps/app/16.0/viin_contacts_map',
    'live_test_url': "https://v16demo-int.viindoo.com",
    'live_test_url_vi_VN': "https://v16demo-vn.viindoo.com",
    'demo_video_url': "https://youtu.be/0mxUczFcUfI",
    'support': 'apps.support@viindoo.com',
    'category': 'Sales/CRM',
    'depends': [
        'contacts',
        'viin_web_map',
        'account'
    ],
    'data': [
        "views/res_partner_views.xml"
    ],
    'images': ['static/description/main_screenshot.png'],
    'installable': True,
    'application': False,
    'auto_install': True,
    'price': 9.9,
    'currency': 'EUR',
    'license': 'OPL-1',
}
