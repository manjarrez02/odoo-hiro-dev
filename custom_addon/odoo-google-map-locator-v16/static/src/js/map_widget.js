/** @odoo-module */
import { registry } from "@web/core/registry";
import { useInputField } from "@web/views/fields/input_field_hook";
import { loadJS } from "@web/core/assets";
import { useService } from "@web/core/utils/hooks";

const { Component, useRef, onMounted, onWillStart, useState } = owl;
var rpc = require('web.rpc');

export class AddressAutocompleteFieldError extends Error {}

export class AddressAutocompleteField extends Component {
    static template = 'FieldAddressAutocomplete';

    setup() {
        super.setup();
        this.rpc = useService("rpc");
        this.userService = useService("user");                     // ← servicio user
        this.input = useRef('inputAddress');
        this.mapContainer = useRef('mapContainer');
        this.state = useState({ apiKeyAvailable: true });

        // bandera de edición según grupo
        this.canEditAddress = false;

        useInputField({ getValue: () => this.props.value || "", refName: "inputAddress" });

        onMounted(() => {
            const initMapWithExistingData = () => {
                this.initializeAutocomplete();

                const recordData = this.props.record && this.props.record.data ? this.props.record.data : {};
                let lat = recordData.latitude;
                let lng = recordData.longitude;

                if (!lat || !lng) {
                    const latInput = document.getElementById('latitude');
                    const lngInput = document.getElementById('longitude');
                    lat = latInput ? parseFloat(latInput.value || latInput.innerText) : NaN;
                    lng = lngInput ? parseFloat(lngInput.value || lngInput.innerText) : NaN;
                }

                if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                    this.initializeMap(lat, lng);
                } else if (this.props.value) {
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ address: this.props.value }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            this.updateMap(results[0].geometry.location);
                        } else {
                            this.initializeMap(null, null);
                        }
                    });
                } else {
                    this.initializeMap(null, null);
                }
            };

            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                initMapWithExistingData();
            } else {
                window.initMap = () => {
                    initMapWithExistingData();
                };
            }
        });

        onWillStart(async () => {
            // 1) determinar si el usuario puede editar, según grupos
            const inContactsMap = await this.userService.hasGroup("__contacts.__custom__contacts_contact_map");
            const inAccessManager = await this.userService.hasGroup("zehntech_access_restriction_by_ip.group_access_manager");
            this.canEditAddress = inContactsMap || inAccessManager;     // ← OR entre ambos grupos [web:105][web:123]

            // 2) cargar API key de Google
            let apiKey;
            try {
                apiKey = await rpc.query({
                    model: 'res.google.api',
                    method: 'api_key_get',
                    args: [],
                });
            } catch (error) {
                this.state.apiKeyAvailable = false;
                return;
            }

            if (!apiKey) {
                this.state.apiKeyAvailable = false;
                return;
            }

            try {
                await loadJS(
                    `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`
                );
            } catch (error) {
                this.state.apiKeyAvailable = false;
                return;
            }

            const jQueryScript = document.createElement('script');
            jQueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
            jQueryScript.onload = () => {
                this.initializeJQuery();
            };
            document.head.appendChild(jQueryScript);
        });
    }

    initializeJQuery() {
        var $ = jQuery.noConflict(true);
        $(document).ready(function() {
            $('.o_content').on('scroll', function() {
                $('.pac-container').hide();
            });
            $('.o_form_sheet_bg').on('scroll', function() {
                $('.pac-container').hide();
            });
        });
    }

    initializeAutocomplete() {
        if (!this.input.el) return;

        const input = this.input.el;

        // --- aquí se aplica el modo solo lectura según grupo ---
        if (!this.canEditAddress) {
            input.readOnly = true;                                   // [web:89][web:97]
            input.setAttribute("readonly", "readonly");
            input.classList.add("o_readonly_modifier");
            // si quieres bloquear incluso foco/click, descomenta:
            // input.tabIndex = -1;
            // input.style.pointerEvents = "none";
            return;
        } else {
            // asegurarse de que el input esté editable para grupos permitidos
            input.readOnly = false;
            input.removeAttribute("readonly");
            input.classList.remove("o_readonly_modifier");
            // input.tabIndex = 0;
            // input.style.pointerEvents = "";
        }
        // -------------------------------------------------------

        const autocomplete = new google.maps.places.Autocomplete(input, {
            types: ['address'],
            fields: ['formatted_address', 'geometry'],
        });

        const geocoder = new google.maps.Geocoder();
        const coordRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)\s*,\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;

        input.addEventListener('input', () => {
            const value = input.value.trim();
            const isCoordinates = coordRegex.test(value);

            if (!isCoordinates) {
                const isValid = this.validateInput(input.value);
                if (!isValid) {
                    console.warn("La dirección contiene caracteres no permitidos.");
                }
            }
        });

        const saveCoordinates = async (latitude, longitude, displayValue = null) => {
            if (this.props.record && this.props.record.update) {
                await this.props.record.update({
                    latitude: latitude,
                    longitude: longitude,
                    partner_latitude: latitude,
                    partner_longitude: longitude,
                });
            }

            const valueToShow = displayValue || `${latitude}, ${longitude}`;
            await this.props.update(valueToShow);
            input.value = valueToShow;
            this.initializeMap(latitude, longitude);
        };

        const fillAddressFields = async (place) => {
            if (!place.geometry || !place.geometry.location) return;

            const latitude = parseFloat(place.geometry.location.lat());
            const longitude = parseFloat(place.geometry.location.lng());
            const formattedAddress = place.formatted_address || input.value || "";

            await saveCoordinates(latitude, longitude, formattedAddress);
        };

        autocomplete.addListener('place_changed', async () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                await fillAddressFields(place);
            }
        });

        input.addEventListener('change', async () => {
            const val = input.value.trim();

            if (!coordRegex.test(val)) return;

            const [latStr, lngStr] = val.split(',');
            const lat = parseFloat(latStr.trim());
            const lng = parseFloat(lngStr.trim());

            await saveCoordinates(lat, lng, `${lat}, ${lng}`);

            geocoder.geocode({ location: { lat, lng } }, async (results, status) => {
                if (status === 'OK' && results[0]) {
                    console.info("Dirección aproximada encontrada:", results[0].formatted_address);
                } else {
                    console.warn("Google Maps no encontró una dirección para estas coordenadas.");
                }
            });
        });
    }

    validateInput(value) {
        const regex = /[^\p{L}\p{N}\s.,\-#/()]/u;

        if (regex.test(value)) {
            console.error(`Invalid address input: ${value}`);
            return false;
        }
        return true;
    }

    initializeMap(lat, lng) {
        const defaultLocation = { lat: 19.643314576802624, lng: -99.1825577803699 };

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng);
        const location = hasValidCoords ? { lat: parsedLat, lng: parsedLng } : defaultLocation;

        if (this.mapContainer.el) {
            const map = new google.maps.Map(this.mapContainer.el, {
                center: location,
                zoom: 15,
            });

            new google.maps.Marker({
                position: location,
                map: map,
            });
        }
    }

    updateMap(location) {
        if (this.mapContainer.el) {
            const map = new google.maps.Map(this.mapContainer.el, {
                center: location,
                zoom: 15,
            });

            new google.maps.Marker({
                position: location,
                map: map,
            });
        }
    }
}

registry.category("fields").add("address_autocomplete", AddressAutocompleteField);