odoo.define('pos_all_in_one.PosOrdersDetailRestric', function(require) {
	'use strict';

	
	const PosComponent = require('point_of_sale.PosComponent');
	const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
	const Registries = require('point_of_sale.Registries');
    const { useListener } = require("@web/core/utils/hooks");
    const { useExternalListener,useState } = owl;

	class PosOrdersDetailRestric extends AbstractAwaitablePopup {
		setup() {
			super.setup();
		}
	}
	
	PosOrdersDetailRestric.template = 'PosOrdersDetailRestric';
	Registries.Component.add(PosOrdersDetailRestric);
	return PosOrdersDetailRestric;
});