odoo.define('viin_web_map.ViinMapController', function (require) {
    'use strict';

    const AbstractController = require('web.AbstractController');

    const core = require('web.core');
    const qweb = core.qweb;

    const MAP_API_URL = 'https://www.google.com/maps/dir/?api=1';

    const ViinMapController = AbstractController.extend({
        custom_events: _.extend({}, AbstractController.prototype.custom_events, {
            'marker_edit_clicked': '_onMarkerEditClicked',
            'pager_changed': '_onPagerChanged',
        }),

        update: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._fetchCoordinateFromAddress();
            });
        },

        on_attach_callback: function() {
            this._fetchCoordinateFromAddress();
            return this._super.apply(this, arguments)
        },

        renderButtons: function ($node) {
            let url = MAP_API_URL;
            const records = this.model.data.records;

            if (records.length) {
                url += '&waypoints=';
                const hasCoordinates = records.filter((r) => r.partner && r.partner.partner_latitude && r.partner.partner_longitude);
                var uniqRecordHasCoordinates = _.uniq(hasCoordinates, (r) => r.partner.partner_latitude + '|' + r.partner.partner_longitude);
                _.each(uniqRecordHasCoordinates, function(r) {
                    url += r.partner.partner_latitude + ',' + r.partner.partner_longitude + '|';
                })
                url = url.slice(0, -1);
            }
            const $buttons = $(qweb.render("ViinMapView.buttons"), {widget: this});
            $buttons.find('a').attr('href', url);
            this.$buttons = $buttons;
            if($node) {
                $buttons.appendTo($node);
            }
        },

        _getPagerParams: function () {
            const currentState = this.model.get();
            return {
                size: currentState.count,
                current_min: currentState.offset + 1,
                limit: currentState.limit,
            };
        },

        /**
         * Return the params (currentMinimum, limit and size) to pass to the pager,
         * according to the current state.
         *
         * @override
         * @returns {Object}
         */
         _getPagingInfo: function (state) {
            var params = this._getPagerParams();
            return {
                currentMinimum: params.current_min,
                limit: params.limit,
                size: params.size,
                onPagerChanged: this._onPagerChanged.bind(this)
            };
         },

        _onPagerChanged: async function ({ currentMinimum, limit }) {
            var data = this.model.get(this.handle, { raw: true });
            var reloadParams;
            var limitChanged = (data.limit !== limit);
            var self = this
            if (data.groupedBy && data.groupedBy.length) {
                reloadParams = { groupsLimit: limit, groupsOffset: currentMinimum - 1, domain: this.model.domain };
            } else {
                reloadParams = { limit: limit, offset: currentMinimum - 1, domain: this.model.domain };
            }
            await this.reload(reloadParams).then(function() {
                // reset the scroll position to the top on page changed only
                if (!limitChanged) {
                    self.trigger_up('scrollTo', { top: 0 });
                }
            });
        },

        _onMarkerEditClicked: function (e) {
            if (e && e.data) {
                this.trigger_up('switch_view', {
                view_type: 'form',
                res_id: e.data.id,
                mode: 'readonly',
                model: this.modelName
            });
        }
        },

        _fetchCoordinateFromAddress: function(){
            var self = this;
            var promises = this.model.fetchCoordinateFromAddress();
            this.model.partnerWithoutLatLong = [];
            Promise.all(promises).then(function(partners) {
                var detail_list_scroll = $('.o_viin_pin_list_container').scrollTop();
                self.renderer._renderMarkers();
                self.renderer._renderRoutes();
                // Update pin list detail
                self.renderer._renderPinList();
                $('.o_viin_pin_list_container').scrollTop(detail_list_scroll);
                // Remove 'updating' tooltip
                $('.o_viin_pin_list_container li .text-muted').removeAttr('data-toogle');
                $('.o_viin_pin_list_container li .text-muted').removeAttr('title');
            });
        },
    });

    return ViinMapController;
});
