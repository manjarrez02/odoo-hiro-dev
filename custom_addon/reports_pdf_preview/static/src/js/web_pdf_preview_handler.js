/** @odoo-module **/

import { registry } from "@web/core/registry";
import { PdfPreviewDialog } from "./web_pdf_preview_dialog";

/* 
 * ADD PDF PREVIEW ON REPORT HANDLERS
 * Copyright 2024 Pablo Luaces <pablo.luaces@gmail.com>
 * Tested on Odoo 16.0
 */

async function PdfPreviewHandler(action, options, env) {
    if (action.report_type === "qweb-pdf") {
        const userId = env.services.user.context.uid;
        const wkhtmltopdfState = await env.services.rpc('/report/check_wkhtmltopdf');
        const wkhtmltopdf = (wkhtmltopdfState === 'upgrade' || wkhtmltopdfState === 'ok');

        if (wkhtmltopdf) {
            const previewActive = (await env.services.orm.call('res.users', 'search_read', [
                [['id', '=', userId]],
                ['show_report_preview']
            ]))[0].show_report_preview || false;

            if (previewActive) {
                env.services.dialog.add(PdfPreviewDialog, { action });
                return Promise.resolve(true);
            }
        } else console.error(`Wkhtmltopdf its not working properly, status: ${wkhtmltopdfState}`);
    }
    
    return Promise.resolve(false);
}

registry.category("ir.actions.report handlers").add("pdf_handler", PdfPreviewHandler);
