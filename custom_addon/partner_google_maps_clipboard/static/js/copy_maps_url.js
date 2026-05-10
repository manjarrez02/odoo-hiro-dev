/** @odoo-module **/

import { FormController } from "@web/views/form/form_controller";
import { patch } from "@web/core/utils/patch";

function legacyCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-1000px";
    textArea.style.left = "-1000px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let ok = false;
    try {
        ok = document.execCommand("copy");
    } catch (error) {
        ok = false;
    }

    document.body.removeChild(textArea);
    return ok;
}

async function copyText(text) {
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
        }
    }
    return legacyCopy(text);
}

patch(FormController.prototype, "partner_google_maps_clipboard_form_controller", {
    setup() {
        this._super(...arguments);
    },

    async onClick(ev) {
        const button = ev.target.closest(".o_copy_google_maps_url");
        if (button) {
            ev.preventDefault();
            ev.stopPropagation();

            const form = button.closest(".o_form_view") || document;
            const input = form.querySelector('input[name="google_maps_url"]');
            const url = input ? input.value : "";

            if (!url) {
                this.displayNotification({
                    title: "Sin URL",
                    message: "No hay URL de Google Maps para copiar.",
                    type: "warning",
                });
                return;
            }

            const copied = await copyText(url);

            if (copied) {
                this.displayNotification({
                    title: "Copiado",
                    message: "La URL de Google Maps fue copiada al portapapeles.",
                    type: "success",
                });
            } else {
                this.displayNotification({
                    title: "No se pudo copiar",
                    message: "Tu navegador bloqueó el copiado automático. Puedes copiar la URL manualmente del campo mostrado.",
                    type: "warning",
                });
            }
            return;
        }

        return this._super(...arguments);
    },
});