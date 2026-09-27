/** @odoo-module **/

import { FormController } from "@web/views/form/form_controller";
import { patch } from "@web/core/utils/patch";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(FormController.prototype, "loyalty_bundle_pricing_save_promo_confirm", {
    async saveButtonClicked(params) {
        const _superSave = this._super
            ? this._super.bind(this)
            : FormController.prototype.saveButtonClicked.bind(this);

        const root = this.model && this.model.root;
        const resModel = (root && root.resModel) || (this.props && this.props.resModel);

        if (resModel !== "sale.order" || !root) {
            return _superSave(params);
        }

        const data = root.data || {};
        const orm = this.env.services.orm;
        const dialog = this.env.services.dialog;

        // Si hay cambios pendientes en precios por familia, permitir que ese flujo se resuelva primero
        if (data.has_pending_family_updates) {
            return _superSave(params);
        }

        // Si no hay promociones aplicables pendientes o el usuario eligió no aplicarlas en esta sesión
        if (!data.has_unapplied_promotions || data.promo_dismissed) {
            return _superSave(params);
        }

        return new Promise((resolve) => {
            dialog.add(ConfirmationDialog, {
                title: _t("Promociones Disponibles"),
                body: _t("Existen promociones aplicables para esta cotización (ej. paquetes Compra X por $Y). ¿Deseas aplicar el beneficio antes de guardar?"),
                confirmLabel: _t("Aplicar y guardar"),
                cancelLabel: _t("Guardar sin aplicar"),
                confirm: async () => {
                    const saveResult = await _superSave(params);
                    if (saveResult) {
                        const recordId = this.model.root && this.model.root.resId;
                        if (recordId) {
                            await orm.call("sale.order", "action_apply_pending_promotions", [[recordId]]);
                            await this.model.load({ resId: recordId });
                        }
                    }
                    resolve(saveResult);
                },
                cancel: async () => {
                    const saveResult = await _superSave(params);
                    if (saveResult) {
                        const recordId = this.model.root && this.model.root.resId;
                        if (recordId) {
                            await orm.call("sale.order", "action_dismiss_pending_promotions", [[recordId]]);
                            await this.model.load({ resId: recordId });
                        }
                    }
                    resolve(saveResult);
                },
            });
        });
    },
});
