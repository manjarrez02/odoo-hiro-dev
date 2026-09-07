odoo.define('pos_product_image_lazyload.Chrome', function (require) {
    'use strict';

    const Chrome = require('point_of_sale.Chrome');
    const Registries = require('point_of_sale.Registries');

    const PosProductImageLazyloadChrome = (Chrome) =>
        class extends Chrome {
            _preloadImages() {
                // Desactiva la pre-descarga masiva de imágenes de los miles de productos
                // para evitar saturar los workers de Odoo y la cola de sockets del navegador.
                // Se conservan únicamente las imágenes de categorías y elementos estáticos de UI.
                for (let category of Object.values(this.env.pos.db.category_by_id)) {
                    if (category.id === 0) continue;
                    const image = new Image();
                    image.src = `/web/image?model=pos.category&field=image_128&id=${category.id}&unique=${category.write_date}`;
                }
                const staticImages = ['backspace.png', 'bc-arrow-big.png'];
                for (let imageName of staticImages) {
                    const image = new Image();
                    image.src = `/point_of_sale/static/src/img/${imageName}`;
                }
            }
        };

    Registries.Component.extend(Chrome, PosProductImageLazyloadChrome);

    return Chrome;
});
