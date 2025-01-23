/** @odoo-module **/

import {ActionMenus} from "@web/search/action_menus/action_menus";
import { registry } from "@web/core/registry";
import core from 'web.core';
var _t = core._t;
let ks_action_registryId = 0;

ActionMenus.prototype.setActionItems = async function(props){
    const ks_hide_actions = await this.orm.call("user.management", "ks_search_action_button", [1, this.props.resModel]);

    let ks_async_callback_Actions = (props.items.other || []).map((ks_action) =>
        Object.assign({ key: `action-${ks_action.description}` }, ks_action)
    );

    if(ks_hide_actions.length){
        ks_async_callback_Actions = _.filter(ks_async_callback_Actions,function(val){
            return !_.contains(ks_hide_actions,val.key)
        })
    }

    const ks_registry_Actions = [];
    for (const { Component, getProps } of registry.category("action_menus").getAll()) {
        const ks_item_Props = await getProps(props, this.env);
        if (ks_item_Props) {
            ks_registry_Actions.push({
                Component,
                key: `registry-action-${ks_action_registryId++}`,
                props: ks_item_Props,
            });
        }
    }

    const ks_all_actions = props.items.action || [];
    const ks_format_Actions = ks_all_actions.map((ks_action) => ({
        action:ks_action,
        description: ks_action.name,
        key: ks_action.id,
    }));



    return [ ...ks_async_callback_Actions,...ks_format_Actions,...ks_registry_Actions];
}