/** @odoo-module */

import { useService } from "@web/core/utils/hooks";

import Chrome from "point_of_sale.Chrome";
import CustomerDisplay from "pos_customer_screen.CustomerDisplay"
import ProductScreen from "point_of_sale.ProductScreen";
import Registries from "point_of_sale.Registries";
import { PosGlobalState } from "point_of_sale.models";
import { configureGui } from "point_of_sale.Gui";
import { registry } from "@web/core/registry";
import env from "point_of_sale.env";
import { debounce } from "@web/core/utils/timing";
import { batched } from "point_of_sale.utils";

const { Component, reactive, markRaw, useExternalListener, useSubEnv, onWillUnmount, xml } = owl;

export class ChromeAdapterCustom extends Component {
    setup() {
        this.PosChrome = Registries.Component.get(CustomerDisplay);
        ProductScreen.sortControlButtons();
        const legacyActionManager = useService("legacy_action_manager");
        const pos = PosGlobalState.create({ env: markRaw(env) });

        this.batchedCustomerDisplayRender = batched(() => {
            reactivePos.send_current_order_to_customer_facing_display();
        });
        const reactivePos = reactive(pos, this.batchedCustomerDisplayRender);
        env.pos = reactivePos;
        env.legacyActionManager = legacyActionManager;
        env.proxy.set_pos(reactivePos);
        window.posmodel = pos.debug ? reactivePos : pos;
        this.env = env;
        this.__owl__.childEnv = env;
        useSubEnv({
            get isMobile() {
                return window.innerWidth <= 768;
            },
        });
        let currentIsMobile = this.env.isMobile;
        const updateUI = debounce(() => {
            if (this.env.isMobile !== currentIsMobile) {
                currentIsMobile = this.env.isMobile;
                this.render(true);
            }
        }, 15);
        useExternalListener(window, "resize", updateUI);
        onWillUnmount(updateUI.cancel);
    }
    async configureAndStart(chrome) {
        const BlockUiFromRegistry = registry.category("main_components").get("BlockUI");
        registry.category("main_components").remove("BlockUI");
        configureGui({ component: chrome });
        await chrome.start();
        registry.category("main_components").add("BlockUI", BlockUiFromRegistry);
        this.batchedCustomerDisplayRender();
    }
}
ChromeAdapterCustom.template = xml`<t t-component="PosChrome" setupIsDone.bind="configureAndStart"/>`;