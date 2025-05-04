/** @odoo-module */

import { startWebClient } from "@web/start";

import { ChromeAdapterCustom } from "@pos_customer_screen/entry/chrome_adapter";
import Registries from "point_of_sale.Registries";
import { registry } from "@web/core/registry";

const { Component, xml } = owl;

class PosAppCustom extends Component {
    setup() {
        this.Components = registry.category("main_components").getEntries();
    }
}
PosAppCustom.template = xml`
    <body>
        <ChromeAdapterCustom />
        <div>
            <t t-foreach="Components" t-as="C" t-key="C[0]">
                <t t-component="C[1].Component" t-props="C[1].props"/>
            </t>
        </div>
    </body>
`;
PosAppCustom.components = { ChromeAdapterCustom };

function startPosApp() {
    Registries.Component.freeze();
    Registries.Model.freeze();
    startWebClient(PosAppCustom);
}

startPosApp();