odoo.define('pos_customer_screen.LeftWidget', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { onMounted, onPatched } = owl;

    class LeftWidget extends PosComponent {
        setup() {
            super.setup();
            this.previousLines = [];

            onMounted(() => this.handleScroll());
            onPatched(() => this.handleScroll());
        }

        handleScroll() {
            const currentLines = this.props.orderLines;
            const previousLines = this.previousLines;

            let updatedLine = null;
            let newLine = null;

            for (const line of currentLines) {
                const previous = previousLines.find(l => l.id === line.id);
                if (!previous) {
                    newLine = line;
                } else if (JSON.stringify(previous) !== JSON.stringify(line)) {
                    updatedLine = line;
                }
            }

            if (newLine) {
                console.log("Producto nuevo");
                this.scrollToOrderline(newLine.id, true);
            } else if (updatedLine) {
                console.log("Producto repetido");
                this.scrollToOrderline(updatedLine.id, false);
            } else {
                this.scrollToBottom();
            }

            this.previousLines = JSON.parse(JSON.stringify(currentLines));
        }

        scrollToBottom() {
            const container = this.__owl__.refs.scrollable;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }

        scrollToOrderline(id, isNew) {
            const lineElement = this.el.querySelector(`.orderlines [data-id="${id}"]`);
            if (lineElement) {
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest'});

                const className = isNew ? 'highlight-new-orderline' : 'highlight-updated-orderline';
                lineElement.classList.add(className);

                setTimeout(() => {
                    lineElement.classList.remove('highlight-new-orderline', 'highlight-updated-orderline');
                }, 1500);
            }
        }
    }

    LeftWidget.template = 'LeftWidget';
    Registries.Component.add(LeftWidget);

    return LeftWidget;
});
