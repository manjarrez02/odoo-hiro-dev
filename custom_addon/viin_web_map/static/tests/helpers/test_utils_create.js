odoo.define('viin_web_map.test_utils_create', function (require) {
"use strict";

/**
 * Create Test Utils
 *
 * This module defines various utility functions to help creating mock widgets
 *
 * Note that all methods defined in this module are exported in the main
 * testUtils file.
 */
var concurrency = require('web.concurrency');
var testUtilsCreate = require('web.test_utils_create');


/**
 * Similar as createView, but specific for viin map views. Some viin map
 * tests need to trigger positional clicks on the DOM produced by viin map.
 * Those tests must use this helper with option positionalClicks set to true.
 * This will move the rendered viin map to the body (required to do positional
 * clicks).
 *
 * @param {Object} params see @createView
 * @param {Object} [options]
 * @param {boolean} [options.positionalClicks=false]
 * @returns {Promise<ViinMapController>}
 */
async function createViinMapView(params, options) {
    var viin_map = await testUtilsCreate.createView(params);
    if (!options || !options.positionalClicks) {
        return viin_map;
    }
    var $view = $('#qunit-fixture').contents();
    $view.prependTo('body');
    var destroy = viin_map.destroy;
    viin_map.destroy = function () {
        $view.remove();
        destroy();
    };
    await concurrency.delay(0);
    return viin_map;
}

testUtilsCreate.createViinMapView = createViinMapView;
return testUtilsCreate;

});
