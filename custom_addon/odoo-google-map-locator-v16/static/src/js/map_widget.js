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
        this.input = useRef('inputAddress');
        this.mapContainer = useRef('mapContainer');
        this.state = useState({ apiKeyAvailable: true });

        useInputField({ getValue: () => this.props.value || "", refName: "inputAddress" });

    onMounted(() => {
        const initMapWithExistingData = () => {
            this.initializeAutocomplete();
            
            // 1. Obtener valores directamente del registro de Odoo (Ignorando el DOM visual)
            // Asegúrate de que los campos técnicos en Odoo se llamen 'latitude' y 'longitude'
            const recordData = this.props.record && this.props.record.data ? this.props.record.data : {};
            let lat = recordData.latitude;
            let lng = recordData.longitude;

            // 2. Si por algún motivo no están en record.data, intentamos buscar en el DOM como último recurso
            if (!lat || !lng) {
                const latInput = document.getElementById('latitude');
                const lngInput = document.getElementById('longitude');
                lat = latInput ? parseFloat(latInput.value || latInput.innerText) : NaN;
                lng = lngInput ? parseFloat(lngInput.value || lngInput.innerText) : NaN;
            }

            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                // Si tenemos coordenadas reales, centramos el mapa ahí
                this.initializeMap(lat, lng);
            } else if (this.props.value) {
                // Si solo tenemos el texto de map_address (this.props.value), buscamos la ubicación de nuevo
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: this.props.value }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        this.updateMap(results[0].geometry.location);
                    } else {
                        this.initializeMap(null, null); // Ubicación por defecto (San Francisco)
                    }
                });
            } else {
                // Si el campo está completamente vacío (ej. creando un registro nuevo)
                this.initializeMap(null, null);
            }
        };

        // Ensure Google Maps API is loaded before initializing autocomplete
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            initMapWithExistingData();
        } else {
            window.initMap = () => {
                initMapWithExistingData();
            };
        }
    });

        onWillStart(async () => {
            // Fetch API key from server
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
            
            // Load jQuery from CDN
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

        const autocomplete = new google.maps.places.Autocomplete(this.input.el, {
            types: ['address'],
            fields: ['formatted_address', 'geometry'],
        });

        const geocoder = new google.maps.Geocoder();
        const coordRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)\s*,\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;

        this.input.el.addEventListener('input', () => {
            const value = this.input.el.value.trim();
            const isCoordinates = coordRegex.test(value);

            if (!isCoordinates) {
                const isValid = this.validateInput(this.input.el.value);
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
            this.input.el.value = valueToShow;
            this.initializeMap(latitude, longitude);
        };

        const fillAddressFields = async (place) => {
            if (!place.geometry || !place.geometry.location) return;

            const latitude = parseFloat(place.geometry.location.lat());
            const longitude = parseFloat(place.geometry.location.lng());
            const formattedAddress = place.formatted_address || this.input.el.value || "";

            await saveCoordinates(latitude, longitude, formattedAddress);
        };

        autocomplete.addListener('place_changed', async () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                await fillAddressFields(place);
            }
        });

        this.input.el.addEventListener('change', async () => {
            const val = this.input.el.value.trim();

            if (!coordRegex.test(val)) return;

            const [latStr, lngStr] = val.split(',');
            const lat = parseFloat(latStr.trim());
            const lng = parseFloat(lngStr.trim());

            // Primero guardar el punto exacto y mostrar las coordenadas
            await saveCoordinates(lat, lng, `${lat}, ${lng}`);

            // Luego, opcionalmente, buscar una dirección descriptiva
            geocoder.geocode({ location: { lat, lng } }, async (results, status) => {
                if (status === 'OK' && results[0]) {
                    // Si quieres mostrar dirección amigable en el input, descomenta:
                    // await this.props.update(results[0].formatted_address);
                    // this.input.el.value = results[0].formatted_address;

                    // Si NO quieres perder la referencia exacta, déjalo como coordenadas.
                    console.info("Dirección aproximada encontrada:", results[0].formatted_address);
                } else {
                    console.warn("Google Maps no encontró una dirección para estas coordenadas.");
                }
            });
        });
    }

    validateInput(value) {
        // Permite letras Unicode, números, espacios y símbolos comunes de direcciones
        const regex = /[^\p{L}\p{N}\s.,\-#/()]/u;

        if (regex.test(value)) {
            console.error(`Invalid address input: ${value}`);
            return false;
        }
        return true;
    }
    
    

    initializeMap(lat, lng) {      
        // Set a default location (for example, San Francisco)
        const defaultLocation = { lat: 19.643314576802624, lng: -99.1825577803699 }; 
    
        // 1. Convertimos forzosamente los parámetros a números decimales
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        // 2. Validamos que el resultado sean números válidos (no NaN)
        const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

        // 3. Creamos el objeto location pasando los valores numéricos
        const location = hasValidCoords ? { lat: parsedLat, lng: parsedLng } : defaultLocation;
    
        if (this.mapContainer.el) {
            const map = new google.maps.Map(this.mapContainer.el, {
                center: location, // Center map on provided latitude and longitude or default location
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
