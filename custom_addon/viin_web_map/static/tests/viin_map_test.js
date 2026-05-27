odoo.define('viin_web_map.viin_map_test', function(require) {
    var ViinMapView = require('viin_web_map.ViinMapView');
    var testUtils = require('viin_web_map.test_utils');
    var session = require('web.session');

    var createViinMapView = testUtils.createViinMapView;

    function _preventScroll(ev) {
        ev.stopImmediatePropagation();
    }

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function fetch_coordinate_from_address(partner_id) {
        var coordinates = {};
        return coordinates[partner_id] || [];
    }

	const loadScript = (FILE_URL, scriptEle, async = false, type = "text/javascript") => {
		return new Promise((resolve, reject) => {
			try {
				scriptEle.type = type;
				scriptEle.async = async;
				scriptEle.src = FILE_URL;
				scriptEle.addEventListener("load", (ev) => {
					resolve({ status: true });
				});
	
				scriptEle.addEventListener("error", (ev) => {
					reject({
						status: false,
						message: `Failed to load the script ＄{FILE_URL}`,
					});
				});
	
				document.body.appendChild(scriptEle);
			} catch (error) {
				reject(error);
			}
		});
	};

	QUnit.module('Views', {
		beforeEach: async function() {
			await loadScript("/viin_web_map/static/lib/leaflet/leaflet.js", document.createElement("script"));
			window.addEventListener('scroll', _preventScroll, true);
            session.geo_provider = 'openstreetmap';
			session.uid = -1; // TO CHECK
			this.data = {
				'res.partner': {
					fields: {
						id: {string: "ID", type: "integer"},
						display_name: {string: "Display name", type: "char"},
						name: {string: "name", type: "char"},
						mapping_address: {string: "Mapping Address", type: "char"},
						partner_latitude: {string: 'Partner Latitude', type: 'float'},
						partner_longitude: {string: 'Partner Longitude', type: 'float'},
						country_id: {string: "Country", type: "integer"}
					},
					records: [
							    {
							        "id": 14,
							        "display_name": "Azure Interior",
							        "name": "Azure Interior",
							        "mapping_address": "4557 De Silva St,94538 Fremont,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 26,
							        "display_name": "Azure Interior, Brandon Freeman",
							        "name": "Brandon Freeman",
							        "mapping_address": "4557 De Silva St,94538 Fremont,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 33,
							        "display_name": "Azure Interior, Colleen Diaz",
							        "name": "Colleen Diaz",
							        "mapping_address": "4557 De Silva St,94538 Fremont,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 27,
							        "display_name": "Azure Interior, Nicole Ford",
							        "name": "Nicole Ford",
							        "mapping_address": "4557 De Silva St,94538 Fremont,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 10,
							        "display_name": "Deco Addict",
							        "name": "Deco Addict",
							        "mapping_address": "77 Santa Barbara Rd,94523 Pleasant Hill,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 35,
							        "display_name": "Deco Addict, Addison Olson",
							        "name": "Addison Olson",
							        "mapping_address": "77 Santa Barbara Rd,94523 Pleasant Hill,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 18,
							        "display_name": "Deco Addict, Douglas Fletcher",
							        "name": "Douglas Fletcher",
							        "mapping_address": "77 Santa Barbara Rd,94523 Pleasant Hill,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 19,
							        "display_name": "Deco Addict, Floyd Steward",
							        "name": "Floyd Steward",
							        "mapping_address": "77 Santa Barbara Rd,94523 Pleasant Hill,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 11,
							        "display_name": "Gemini Furniture",
							        "name": "Gemini Furniture",
							        "mapping_address": "317 Fairchild Dr,94535 Fairfield,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 20,
							        "display_name": "Gemini Furniture, Edwin Hansen",
							        "name": "Edwin Hansen",
							        "mapping_address": "317 Fairchild Dr,94535 Fairfield,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 22,
							        "display_name": "Gemini Furniture, Jesse Brown",
							        "name": "Jesse Brown",
							        "mapping_address": "317 Fairchild Dr,94535 Fairfield,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 31,
							        "display_name": "Gemini Furniture, Oscar Morgan",
							        "name": "Oscar Morgan",
							        "mapping_address": "317 Fairchild Dr,94535 Fairfield,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 23,
							        "display_name": "Gemini Furniture, Soham Palmer",
							        "name": "Soham Palmer",
							        "mapping_address": "317 Fairchild Dr,94535 Fairfield,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 15,
							        "display_name": "Lumber Inc",
							        "name": "Lumber Inc",
							        "mapping_address": "1337 N San Joaquin St,95202 Stockton,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 34,
							        "display_name": "Lumber Inc, Lorraine Douglas",
							        "name": "Lorraine Douglas",
							        "mapping_address": "1337 N San Joaquin St,95202 Stockton,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 41,
							        "display_name": "My Company (Chicago)",
							        "name": "My Company (Chicago)",
							        "mapping_address": "90 Streets Avenue,60610 Chicago,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 42,
							        "display_name": "My Company (Chicago), Jeff Lawson",
							        "name": "Jeff Lawson",
							        "mapping_address": "90 Streets Avenue,60610 Chicago,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 1,
							        "display_name": "My Company (San Francisco)",
							        "name": "My Company (San Francisco)",
							        "mapping_address": "250 Executive Park Blvd, Suite 3400,94134 San Francisco,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 39,
							        "display_name": "My Company (San Francisco), Chester Reed",
							        "name": "Chester Reed",
							        "mapping_address": "250 Executive Park Blvd, Suite 3400,94134 San Francisco,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 40,
							        "display_name": "My Company (San Francisco), Dwayne Newman",
							        "name": "Dwayne Newman",
							        "mapping_address": "250 Executive Park Blvd, Suite 3400,94134 San Francisco,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 12,
							        "display_name": "Ready Mat",
							        "name": "Ready Mat",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 21,
							        "display_name": "Ready Mat, Billy Fox",
							        "name": "Billy Fox",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 25,
							        "display_name": "Ready Mat, Edith Sanchez",
							        "name": "Edith Sanchez",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 37,
							        "display_name": "Ready Mat, Julie Richards",
							        "name": "Julie Richards",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 24,
							        "display_name": "Ready Mat, Kim Snyder",
							        "name": "Kim Snyder",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 36,
							        "display_name": "Ready Mat, Sandra Neal",
							        "name": "Sandra Neal",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 30,
							        "display_name": "Ready Mat, Theodore Gardner",
							        "name": "Theodore Gardner",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 38,
							        "display_name": "Ready Mat, Travis Mendoza",
							        "name": "Travis Mendoza",
							        "mapping_address": "7500 W Linne Road,95304 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 13,
							        "display_name": "The Jackson Group",
							        "name": "The Jackson Group",
							        "mapping_address": "1611 Peony Dr,95377 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 29,
							        "display_name": "The Jackson Group, Gordon Owens",
							        "name": "Gordon Owens",
							        "mapping_address": "1611 Peony Dr,95377 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 28,
							        "display_name": "The Jackson Group, Toni Rhodes",
							        "name": "Toni Rhodes",
							        "mapping_address": "1611 Peony Dr,95377 Tracy,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 9,
							        "display_name": "Wood Corner",
							        "name": "Wood Corner",
							        "mapping_address": "1839 Arbor Way,95380 Turlock,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 17,
							        "display_name": "Wood Corner, Ron Gibson",
							        "name": "Ron Gibson",
							        "mapping_address": "1839 Arbor Way,95380 Turlock,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 32,
							        "display_name": "Wood Corner, Tom Ruiz",
							        "name": "Tom Ruiz",
							        "mapping_address": "1839 Arbor Way,95380 Turlock,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 16,
							        "display_name": "Wood Corner, Willie Burke",
							        "name": "Willie Burke",
							        "mapping_address": "1839 Arbor Way,95380 Turlock,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 8,
							        "display_name": "YourCompany, Joel Willis",
							        "name": "Joel Willis",
							        "mapping_address": "858 Lynn Street,07002 Bayonne,United States",
							        "partner_latitude": 40.66871,
							        "partner_longitude": -74.11431,
							        "country_id": 10
							    },
							    {
							        "id": 7,
							        "display_name": "YourCompany, Marc Demo",
							        "name": "Marc Demo",
							        "mapping_address": "3575  Buena Vista Avenue,97401 Eugene,United States",
							        "partner_latitude": 0,
							        "partner_longitude": 0,
							        "country_id": 10
							    },
							    {
							        "id": 3,
							        "display_name": "YourCompany, Mitchell Admin",
							        "name": "Mitchell Admin",
							        "mapping_address": "215 Vine St,18503 Scranton,United States",
							        "partner_latitude": 41.41377,
							        "partner_longitude": -75.66324,
							        "country_id": 10
							    }
							],
					check_access_rights: function () {
	                    return Promise.resolve(true);
	                },
				},
			};
		},
		afterEach: function () {
			let script = document.querySelector('script[src="/viin_web_map/static/lib/leaflet/leaflet.js"]');
			script.remove();
	        window.removeEventListener('scroll', _preventScroll, true);
	    },
	}, function() {
		QUnit.module('ViinMapView');

		odoo.session_info = {};
		odoo.session_info.user_context = {};
		QUnit.test('simple rendering map', async function(assert) {
			assert.expect(5);
			var viin_map = await createViinMapView({
	            View: ViinMapView,
	            model: 'res.partner',
	            data: this.data,
	            arch:
	            '<viin_map res_partner="id"> '+
	                '<marker-popup>" '+
	                '<field name="name" string="Name "/>" '+
	                '<field name="mapping_address" string="Address "/> '+
	                '</marker-popup>" '+
	            '</viin_map>',
				mockRPC: function (route, args) {
					if(route == '/viin_map/fetch_coordinate_from_address') {
                        return Promise.resolve(fetch_coordinate_from_address(args.partner_id));
                    }
                    if(route == '/viin_map/update_latitude_longitude') {
                        return Promise.resolve({});
                    }
					return this._super.apply(this, arguments);
				},
	            viewOptions: {

	            },
        	});
			await timeout(5000)
			assert.ok(viin_map.$('.o_viin_map_container').length, 'should display map container');
			assert.ok(viin_map.$('.o_viin_pin_list_container').length, 'should display list container');
			assert.equal(viin_map.$('.o_viin_pin_list_details .o_pin_located').length, 2, 'There should be 2 contact have location');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-in').length, 'There should be zoom in icon');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-out').length, 'There should be zoom in icon');
			viin_map.destroy();

	  });

	  QUnit.test('switch map view', async function (assert) {
	        assert.expect(5);

	        var viin_map = await createViinMapView({
	            View: ViinMapView,
	            model: 'res.partner',
	            data: this.data,
	            arch:
	            '<viin_map res_partner="id"> '+
	                '<marker-popup>" '+
	                '<field name="name" string="Name "/>" '+
	                '<field name="mapping_address" string="Address "/> '+
	                '</marker-popup>" '+
	            '</viin_map>',
				mockRPC: function (route, args) {
					if(route == '/viin_map/fetch_coordinate_from_address') {
                        return Promise.resolve(fetch_coordinate_from_address(args.partner_id));
                    }
                    if(route == '/viin_map/update_latitude_longitude') {
                        return Promise.resolve({});
                    }
					return this._super.apply(this, arguments);
				},
	            viewOptions: {

	            },
        	});
			await timeout(5000)
	        assert.ok(viin_map.$('.o_viin_map_container').length, 'should display map container');
			assert.ok(viin_map.$('.o_viin_pin_list_container').length, 'should display list container');
			assert.equal(viin_map.$('.o_viin_pin_list_details .o_pin_located').length, 2, 'There should be 2 contact have location');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-in').length, 'There should be zoom in icon');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-out').length, 'There should be zoom in icon');

	        viin_map.destroy();
	    });

		QUnit.test('when update geo location for contact that haven\'t yet had geo location', async function(assert) {
			var self = this;
			assert.expect(5);
			// Update geo location for contact that have id = 26 (Brandon Freeman)
			_.each(this.data['res.partner'].records, function(contact, ind) {
				if(contact.id == 26) {
					self.data['res.partner'].records[ind].partner_latitude = 37.53043;
					self.data['res.partner'].records[ind].partner_longitude = -121.97467;
				}
			});
			var viin_map = await createViinMapView({
	            View: ViinMapView,
	            model: 'res.partner',
	            data: this.data,
	            arch:
	            '<viin_map res_partner="id"> '+
	                '<marker-popup>" '+
	                '<field name="name" string="Name "/>" '+
	                '<field name="mapping_address" string="Address "/> '+
	                '</marker-popup>" '+
	            '</viin_map>',
				mockRPC: function (route, args) {
					if(route == '/viin_map/fetch_coordinate_from_address') {
                        return Promise.resolve(fetch_coordinate_from_address(args.partner_id));
                    }
                    if(route == '/viin_map/update_latitude_longitude') {
                        return Promise.resolve({});
                    }
					return this._super.apply(this, arguments);
				},
	            viewOptions: {

	            },
        	});
			await timeout(5000)
			assert.ok(viin_map.$('.o_viin_map_container').length, 'should display map container');
			assert.ok(viin_map.$('.o_viin_pin_list_container').length, 'should display list container');
			assert.equal(viin_map.$('.o_viin_pin_list_details .o_pin_located').length, 3, 'There should be 3 contact have location');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-in').length, 'There should be zoom in icon');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-out').length, 'There should be zoom in icon');
			viin_map.destroy();
	  });

	  QUnit.test('when delete geo location for contact that already had geo location', async function(assert) {
			var self = this;
			assert.expect(5);
			// Delete geo location for contact that have id = 8 (Joel Wills)
			_.each(this.data['res.partner'].records, function(contact, ind) {
				if(contact.id == 8) {
					self.data['res.partner'].records[ind].partner_latitude = undefined;
					self.data['res.partner'].records[ind].partner_longitude = undefined;
				}
			});

			var viin_map = await createViinMapView({
	            View: ViinMapView,
	            model: 'res.partner',
	            data: this.data,
	            arch:
	            '<viin_map res_partner="id"> '+
	                '<marker-popup>" '+
	                '<field name="name" string="Name "/>" '+
	                '<field name="mapping_address" string="Address "/> '+
	                '</marker-popup>" '+
	            '</viin_map>',
				mockRPC: function (route, args) {
					if(route == '/viin_map/fetch_coordinate_from_address') {
                        return Promise.resolve(fetch_coordinate_from_address(args.partner_id));
                    }
                    if(route == '/viin_map/update_latitude_longitude') {
                        return Promise.resolve({});
                    }
					return this._super.apply(this, arguments);
				},
	            viewOptions: {

	            },
        	});
			await timeout(5000)
			assert.ok(viin_map.$('.o_viin_map_container').length, 'should display map container');
			assert.ok(viin_map.$('.o_viin_pin_list_container').length, 'should display list container');
			assert.equal(viin_map.$('.o_viin_pin_list_details .o_pin_located').length, 1, 'There should be 1 contact have location');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-in').length, 'There should be zoom in icon');
			assert.ok(viin_map.$('.leaflet-control-zoom .leaflet-control-zoom-out').length, 'There should be zoom in icon');
			viin_map.destroy();
	  });

	  QUnit.test('when click contact', async function (assert) {
			var self = this;
			assert.expect(1);
			// Update geo location for contact that have id = 26 (Brandon Freeman)
			_.each(this.data['res.partner'].records, function(contact, ind) {
				if(contact.id == 26) {
					self.data['res.partner'].records[ind].partner_latitude = 37.53043;
					self.data['res.partner'].records[ind].partner_longitude = -121.97467;
				}
			});
			var viin_map = await createViinMapView({
	            View: ViinMapView,
	            model: 'res.partner',
	            data: this.data,
	            arch:
	            '<viin_map res_partner="id"> '+
	                '<marker-popup>" '+
	                '<field name="name" string="Name "/>" '+
	                '<field name="mapping_address" string="Address "/> '+
	                '</marker-popup>" '+
	            '</viin_map>',
				mockRPC: function (route, args) {
					if(route == '/viin_map/fetch_coordinate_from_address') {
                        return Promise.resolve(fetch_coordinate_from_address(args.partner_id));
                    }
                    if(route == '/viin_map/update_latitude_longitude') {
                        return Promise.resolve({});
                    }
					return this._super.apply(this, arguments);
				},
	            viewOptions: {

	            },
        	}, {positionalClicks: true});
			await timeout(5000)
			await testUtils.dom.click($('.o_viin_pin_list_container .o_pin_located').last().find('a'));
			await timeout(3000)
			// marker last is Michell Admin
			var lastMarkerOffset = $('.leaflet-marker-pane img').last().offset();
			var mapContainerWidth = $('.o_viin_map_container').width();
			var pinListWidth = $('.o_viin_pin_list_container').width();
			var visualMapContainer = mapContainerWidth - pinListWidth;
			var visualCenterLeft = visualMapContainer/2;

			assert.equal(lastMarkerOffset.left >=  visualCenterLeft - 200 && lastMarkerOffset.left <=  visualCenterLeft + 200, true,
			'Contact marker should be in center of map');
	  		viin_map.destroy();
	  });
	});
})
