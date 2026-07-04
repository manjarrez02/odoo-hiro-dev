/** @odoo-module **/

import { registry } from "@web/core/registry";
import { FloatField } from "@web/views/fields/float/float_field";

export class FamilyQtyField extends FloatField {
    async onChange(ev) {
        await super.onChange(ev);
    }
}

FamilyQtyField.supportedTypes = ["float"];
registry.category("fields").add("family_qty_field", FamilyQtyField);