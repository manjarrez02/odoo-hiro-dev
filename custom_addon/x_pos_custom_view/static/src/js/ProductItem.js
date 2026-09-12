/** @odoo-module **/

import ProductItem from 'point_of_sale.ProductItem';
import { patch } from 'web.utils';

patch(ProductItem.prototype, 'pos_product_image_lazyload_item', {
    get imageUrl() {
        const product = this.props.product;
        return `/web/image?model=product.product&field=image_128&id=${product.id}`;
    },
});