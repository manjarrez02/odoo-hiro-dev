odoo.define('viin_web_map.ViinMapModel', function (require) {
    'use strict';

    const AbstractModel = require('web.AbstractModel');
    const session = require('web.session');

    const core = require('web.core');
    const _t = core._t;

    const ViinMapModel = AbstractModel.extend({
        init: function () {
            this._super.apply(this, arguments);
            this.data = {};
            this.data.geo_provider = session.geo_provider;
            this.data.mapBoxToken = session.mapbox_token;
            this.data.timmers = []
        },

        get: function () {
            return this.data;
        },

        load: function (params) {
            this.params = params;
            this._initMapValues(params);

            this.model = params.modelName;
            this.context = params.context;
            this.fields = params.fieldNames;
            this.partnerField = params.partnerField;
            this.orderBy = params.orderBy;
            this.routing = params.routing;

            return this._fetchData();
        },

        reload: function (handle, params) {
            this._initMapValues(params);
            return this._fetchData();
        },

        _initMapValues: function (params) {
            this.partnerIds = [];
            this.partnerWithoutLatLong = [];
            this.numberOfLocatedRecords = 0;

            this.domain = [];

            this.data.offset = 0;
            this.data.limit = 80;
            this.data.count = 0;

            params = params || {}
            if (params) {
                if (params.offset !== undefined) {
                    this.data.offset = params.offset;
                }

                if (params.limit !== undefined) {
                    this.data.limit = params.limit;
                }

                if (params.domain !== undefined) {
                    this.domain = params.domain;
                }
            }

        },

        _fetchData: async function () {
            var self = this;
            if (!this.partnerField) {
                this.data.records = [];
                this.data.route = {routes: []};
                return;
            }

            const results = await this._fetchModelData();
            this.data.records = results.records;
            this.data.count = results.length;
            this.partnerIds = [];
            if (this.model === 'res.partner' && this.partnerField === 'id') {
                _.each(this.data.records, function (r) {
                    r.partner_id = [r.id];
                    self.partnerIds.push(r.id);
                });
            } else {
                this._fillMissingPartnerIds(this.data.records);
            }

            this.partnerIds = _.uniq(this.partnerIds);
            return this._fetchPartners(this.partnerIds);
        },

        _fetchPartners: async function (partnerIds) {
            this.data.partners = [];
            if (partnerIds.length) {
                this.data.partners = await this._fetchPartnerRecords(partnerIds);
            }
            return this._processPartnerAndRecordData().then(() => {
                this._updateUsersCoordinates();
            }).catch((err) => {
                this._handleError(err);
            });
        },

        _fetchPartnerRecords: function (ids) {
            return this._rpc({
                model: 'res.partner',
                method: 'search_read',
                domain: [['country_id', '!=', false], ['id', 'in', ids]],
                fields: ['id', 'mapping_address', 'partner_latitude', 'partner_longitude'],
            });
        },

        _processPartnerAndRecordData: function () {
            var self = this;
            if (this.data.geo_provider === 'mapbox' || this.data.geo_provider === 'googlemap') {
                return Promise.resolve().then(function() {
                    self._addPartnerToRecord();
                    self.data.route = {routes: []};
                    if (self.routing && self.numberOfLocatedRecords > 1) {
                        return self._fetchMapboxRoute().then((routeResult) => {
                            self.data.route = routeResult;
                        });
                    } else {
                        return Promise.resolve();
                    }
                });
            } else {
                return Promise.resolve().then(() => this._addPartnerToRecord());
            }
        },

		fetchCoordinateFromAddress: function() {
			var self = this;
			var i = 0;
			var gapTime = 1200;
			var promises = [];
			self.data.partners.forEach((p) => {
				if (p.mapping_address && (!p.partner_latitude || !p.partner_longitude)) {
                    var promise = new Promise((resolve, reject) => {
                        self.data.timmers.push(setTimeout(function() {
                            self._rpc({
                                route: '/viin_map/fetch_coordinate_from_address',
                                params: {
                                    partner_id: p.id,
                                },
                            }, {shadow: true}).then(coord => {
                                resolve(p);
                                if (coord.constructor === Object && Object.keys(coord).length > 0) {
                                    p.partner_latitude = coord.lat;
                                    p.partner_longitude = coord.lon;
                                    self.partnerWithoutLatLong.push(p);
                                    // Update coordinate to server (dont wait until fetch coordnates for all record)
                                    // Because user may not stay at page until fetch all coordnates
                                    self._updateUsersCoordinates();
                                } else {
                                    p.partner_latitude = p.partner_longitude = undefined;
                                }
                            });
                        }, i*gapTime));
                    });
                    promises.push(promise);
                    i++;
                }
			});
			return promises;
		},

        _isValidCoordinates: function (partner) {
            return !!(partner.partner_latitude && partner.partner_longitude &&
                partner.partner_latitude >= -90 && partner.partner_latitude <= 90 &&
                partner.partner_longitude >= -180 && partner.partner_longitude <= 180);

        },

        _fetchMapboxRoute: function () {
            let coordParams = "";
            let hasCoords = this.data.records.filter((r) => r.partner.partner_latitude && r.partner.partner_longitude);
            _.each(hasCoords, function (r) {
                coordParams += r.partner.partner_longitude + ',' + r.partner.partner_latitude + ';';
            });
            coordParams = coordParams.slice(0, -1);
            const encodedUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${encodeURIComponent(coordParams)}?access_token=${this.data.mapBoxToken}&steps=true&geometries=geojson`;
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: encodedUrl,
                    method: 'GET',
                })
                .then(resolve)
                .catch(reject);
            });
        },

        _handleError: function (err) {
            const message = _t('The view has been switched to another provider but functionalities might be limited.');
            switch (err.status) {
                case 504:
                    this.do_warn(_t('Timed out'), message);
                    break;
                case 500:
                    this.do_warn(_t('Map server unreachable'), message);
                    break;
                case 403:
                    this.do_warn(_t('Unauthorized connection'), message);
                    break;
                case 401:
                    this.do_warn(_t('Invalid token'), message);
                    break;
                case 403:
                    this.do_warn(_t('Unauthorized connection'), message);
                    break;
                default:
                    this.do_warn(_t('An error occured while fetching partner coordinate. Please reload the page!'), message);
            }
        },

        _addPartnerToRecord: function () {
            var self = this;
            _.each(self.data.records, function (record) {
                _.each(self.data.partners, function (partner) {
                    const recordPartnerId = self.model === "res.partner" && self.partnerField === "id" ?
                        record.id : record[self.partnerField][0];
                    if (recordPartnerId === partner.id) {
                        record.partner = partner;
                        self.numberOfLocatedRecords++;
                    }
                });
            });
        },

        _fillMissingPartnerIds: function (records) {
            var self = this;
            return _.each(records, function (r) {
                if (r[self.partnerField]) {
                    self.partnerIds.push(r[self.partnerField][0]);
                }
            });
        },

        _updateUsersCoordinates: function () {
            if (!this.partnerWithoutLatLong.length) {
                return;
            }
            this._rpc({
                route: '/viin_map/update_latitude_longitude',
                params: {
                    partners: this.partnerWithoutLatLong,
                },
                context: this.context,
            });
			// Hide loading indicator to improve user experience
			$('.o_loading').hide();
            this.partnerWithoutLatLong = [];
        },

        _fetchModelData: function () {
            return this._rpc({
                route: '/web/dataset/search_read',
                model: this.model,
                context: this.context,
                domain: this.domain,
                fields: this.fields,
                orderBy: this.orderBy,
                limit: this.data.limit,
                offset: this.data.offset,
            });
        },
    });

    return ViinMapModel;
});
