odoo.define('pos_customer_screen.CustomerDisplay', function (require) {
    "use strict";

    const { useState, useRef, onMounted, onUnmounted } = owl;
    const { useListener } = require("@web/core/utils/hooks");
    const { loadCSS } = require('@web/core/assets');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const { Transition } = require("@web/core/transition");

    class CustomerDisplay extends PosComponent {
        setup() {
            super.setup();
            useListener('click-toggle-slider', this._toggleSlider);
            useListener('click-feedback', this._feedbackPopup);
            useListener('click-sign', this._signPopup);
            useListener('click-create-customer', this._customerCreatePopup);
            this.state = useState({ready: false, rightWidth: 0,
                                    cartData: '',
                                    imageSlider: true,
                                    orderAmount: 0,
                                    changeAmount:0,
                                    });
            this.rightPane = useRef('rightpane');
            
            onMounted(() => {
                $(document).off();
                $(window).off();
                $('html').off();
                $('body').off();
            
                const updateRightWidth = () => {
                    if (this.rightPane.el) {
                        this.state.rightWidth = this.rightPane.el.clientWidth;
                    }
                };
            
                // Establecer el valor inicial
                updateRightWidth();
            
                // Escuchar redimensionamiento de ventana
                window.addEventListener('resize', updateRightWidth);
            
            });
            this.props.setupIsDone(this);
            this.env.services.bus_service.addEventListener('notification', ({ detail: notifications }) => {
                const config_id = odoo.config_id;
                const client_uuid = localStorage.getItem('pos_client_uuid');
            
                const relevantNotifs = notifications.filter(notif =>
                    notif.type === 'customer.display' &&
                    notif.payload?.customer_display_data?.config_id === config_id &&
                    notif.payload.customer_display_data.client_uuid === client_uuid
                );
            
                if (relevantNotifs.length) {
                    // Si hay múltiples, tomamos el último (el más reciente)
                    const lastData = relevantNotifs.at(-1).payload.customer_display_data;
                    this.state.cartData = lastData;
                }
            });
        }
        async start() {
            try {
                await this.env.pos.load_server_data();
                this._buildChrome();
                this.state.ready = true;
                await this.env.services.rpc({
                    model: 'customer.display',
                    method: 'send_data',
                    args: [
                        this.env.pos.pos_session.id,
                        localStorage.getItem('pos_client_uuid'),
                    ],
                });
            } catch (error) {
                let title = 'Unknown Error',
                    body;
                if (error.message && [100, 200, 404, -32098].includes(error.message.code)) {
                    // this is the signature of rpc error
                    if (error.message.code === -32098) {
                        title = 'Network Failure (XmlHttpRequestError)';
                        body =
                            'The Point of Sale could not be loaded due to a network problem.\n' +
                            'Please check your internet connection.';
                    } else if (error.message.code === 200) {
                        title = error.message.data.message || this.env._t('Server Error');
                        body =
                            error.message.data.debug ||
                            this.env._t(
                                'The server encountered an error while receiving your order.'
                            );
                    }
                } else if (error instanceof Error) {
                    title = error.message;
                    if (error.cause) {
                        body = error.cause.message;
                    } else {
                        body = error.stack;
                    }
                }
                await this.showPopup('ErrorTracebackPopup', {
                    title,
                    body,
                    exitButtonIsShown: true,
                });
            }
        }
        _buildChrome() {
            if ($.browser.chrome) {
                var chrome_version = $.browser.version.split('.')[0];
                if (parseInt(chrome_version, 10) >= 50) {
                    loadCSS('/pos_customer_screen/static/src/css/chrome50.css');
                }
            }
            this._disableBackspaceBack();
        }
        _disableBackspaceBack() {
            $(document).on('keydown', function (e) {
                if (e.which === 8 && !$(e.target).is('input, textarea')) {
                     e.preventDefault();
                }
            });
        }
        _toggleSlider(){
            this.state.imageSlider = !this.state.imageSlider;
        }
        async _feedbackPopup(){
            if(this.state.cartData.orderLines){
                const { confirmed, payload } = await this.showPopup('CustomerFeedbackPopup');
                if (confirmed) {
                    await this.rpc({
                        model: 'customer.display',
                        method: 'send_rating',
                        args: [odoo.config_id, payload],
                    });
                }
            }
        }
        async _signPopup(){
            if(this.state.cartData.orderLines){
                const { confirmed, payload } = await this.showPopup('SignaturePopup',{
                title: this.env._t('Signature')
                });
                if (confirmed) {
                    await this.rpc({
                        model: 'customer.display',
                        method: 'send_signature',
                        args: [odoo.config_id, payload],
                    });
                }
            }
        }
        async _customerCreatePopup(){
            if(this.state.cartData.orderLines){
                const { confirmed, payload } = await this.showPopup('CustomerCreatePopup');
                if (confirmed) {
                    await this.rpc({
                        model: 'customer.display',
                        method: 'create_customer',
                        args: [payload, odoo.config_id],
                    });
                }
            }
        }
    }

    CustomerDisplay.template = 'CustomerDisplay';

    Object.defineProperty(CustomerDisplay, "components", {
        get () {
            return Object.assign({ Transition }, PosComponent.components);
        }
    })

    Registries.Component.add(CustomerDisplay);

    return CustomerDisplay;
});