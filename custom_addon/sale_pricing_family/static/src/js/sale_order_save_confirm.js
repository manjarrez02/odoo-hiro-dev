/** @odoo-module **/

import { FormController } from "@web/views/form/form_controller";
import { patch } from "@web/core/utils/patch";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

const _originalSaveButtonClicked = FormController.prototype.saveButtonClicked;

patch(FormController.prototype, "sale_pricing_family_save_confirm_v4", {
    async saveButtonClicked(params) {
        const root = this.model && this.model.root;
        const resModel = (root && root.resModel) || (this.props && this.props.resModel);

        if (resModel !== "sale.order" || !root) {
            return _originalSaveButtonClicked.call(this, params);
        }

        const data = root.data || {};
        const orm = this.env.services.orm;
        const dialog = this.env.services.dialog;

        if (!data.has_pending_family_updates) {
            return _originalSaveButtonClicked.call(this, params);
        }

        return new Promise((resolve) => {
            dialog.add(ConfirmationDialog, {
                title: _t("Cambios pendientes"),
                body: _t("Hay cambios pendientes en precios por familia. ¿Deseas aplicar el recálculo antes de guardar?"),
                confirmLabel: _t("Aplicar y guardar"),
                cancelLabel: _t("Guardar sin aplicar"),
                confirm: async () => {
                    const saveResult = await _originalSaveButtonClicked.call(this, params);
                    const recordId = this.model.root.resId;
                    if (recordId) {
                        await orm.call("sale.order", "action_recompute_family_prices", [[recordId]]);
                        await this.model.load();
                        await this.render(true);
                    }
                    resolve(saveResult);
                },
                cancel: async () => {
                    const saveResult = await _originalSaveButtonClicked.call(this, params);
                    const recordId = this.model.root.resId;
                    if (recordId) {
                        await orm.call("sale.order", "action_clear_pending_family_updates", [[recordId]]);
                        await this.model.load();
                        await this.render(true);
                    }
                    resolve(saveResult);
                },
            });
        });
    },
});