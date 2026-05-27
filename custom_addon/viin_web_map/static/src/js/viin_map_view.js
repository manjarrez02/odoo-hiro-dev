odoo.define('viin_web_map.ViinMapView', function (require) {
    "use strict";

    const AbstractView = require('web.AbstractView');
    const ViinMapModel = require('viin_web_map.ViinMapModel');
    const ViinMapRenderer = require('viin_web_map.ViinMapRenderer');
    const ViinMapController = require('viin_web_map.ViinMapController');
    const viewRegistry = require('web.view_registry');

    const core = require('web.core');
    const _t = core._t;

    const ViinMapView = AbstractView.extend({
        display_name: 'Viin Map',
        viewType: 'viin_map',
        icon: 'fa fa-map-marker',
        jsLibs: [
            '/viin_web_map/static/lib/leaflet/leaflet.js',
        ],
        config: _.extend({}, AbstractView.prototype.config, {
            Model: ViinMapModel,
            Renderer: ViinMapRenderer,
            Controller: ViinMapController,
        }),
        mobile_friendly: true,
        searchMenuTypes: ['filter', 'favorite'],

        init: function (info, params) {
            this._super(...arguments);
            const fieldNames = [this.arch.attrs.res_partner, 'display_name'];
            const markerPopupFieldDescriptors = [];
            _.each(this.arch.children, node => {
                if (node.tag === 'marker-popup') {
                    _.each(node.children, child => {
                        if (child.tag === 'field') {
                            fieldNames.push(child.attrs.name);
                            markerPopupFieldDescriptors.push({
                                fieldName: child.attrs.name,
                                string: child.attrs.string,
                                widget: child.attrs.widget
                            });
                        }
                    });
                }
            });

            this.loadParams.partnerField = this.arch.attrs.res_partner;
            this.loadParams.routing = !!this.arch.attrs.routing;
            this.loadParams.fieldNames = _.uniq(fieldNames);
            if (this.arch.attrs.default_order) {
                this.loadParams.orderBy = [{name: this.arch.attrs.default_order, asc: true}];
            }

            this.rendererParams.numbering = !!this.arch.attrs.routing;
            this.rendererParams.defaultOrder = this.arch.attrs.default_order;
            this.rendererParams.panelTitle = this.arch.attrs.panel_title || params.displayName || _t('Items');
            this.rendererParams.markerPopupFieldDescriptors = markerPopupFieldDescriptors;
            this.rendererParams.hasFormView = params.actionViews.find((view) => view.type === "form");
        },
    });

    viewRegistry.add('viin_map', ViinMapView);

    return ViinMapView;
});
