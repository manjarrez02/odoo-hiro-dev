/** @odoo-module **/

import { Dialog } from "@web/core/dialog/dialog";
import { Component, onMounted } from "@odoo/owl";

/* 
 * ADD NEW PDF PREVIEW DIALOG (REQUIRED WITH OWL)
 * Copyright 2024 Pablo Luaces <pablo.luaces@gmail.com>
 * Tested on Odoo 16.0
 */

export class PdfPreviewDialog extends Component {
    static template = 'reports_pdf_preview.ReportViewer';

    static props = {
        action: { type: Object, optional: false },
        close: { type: Function, optional: true }
    }

    setup() {
        super.setup();
        this.title = this.props.action.name;
        this.url = this.getPdfReportUrl(this.props.action);

        onMounted(() => {
            const reportFullscreenBtn = document.querySelector('.o_ReportViewer_fullscreen');
            if (!reportFullscreenBtn) return

            // Disable fullscreen button
            reportFullscreenBtn.disabled = true;

            // Handle click event
            reportFullscreenBtn.onclick = () => {
                document.querySelector('.o_ReportViewer_iframe').requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            };

            // Enable fullscreen button when report is loaded
            document.querySelector('.o_ReportViewer_iframe').onload = () => {
                reportFullscreenBtn.disabled = false;
            };
        });
    }

    getPdfReportUrl(action) {
        let url = `/report/pdf/${action.report_name}`;
        const actionContext = action.context || {};
        if (action.data && JSON.stringify(action.data) !== "{}") {
            const options = encodeURIComponent(JSON.stringify(action.data));
            const context = encodeURIComponent(JSON.stringify(actionContext));
            url += `?options=${options}&context=${context}`;
        } else if (actionContext.active_ids) url += `/${actionContext.active_ids.join(",")}`;
        return url;
    }
}


PdfPreviewDialog.components = { Dialog };
PdfPreviewDialog.components.Dialog.props = {
    ...Dialog.props,
    pdfPreview: { type: Boolean, optional: true }
}
