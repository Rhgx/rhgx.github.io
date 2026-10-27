/**
 * Map initialization and marker management
 */

// Marker icon configurations
const ICON_CONFIG = {
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
};

/**
 * Create a Leaflet icon with the specified color.
 * @param {string} color - The marker color (e.g., 'red', 'blue')
 * @returns {L.Icon} Leaflet icon instance
 */
export function createIcon(color) {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        ...ICON_CONFIG
    });
}

/**
 * Initialize the Leaflet map.
 * @param {string} elementId - The ID of the map container element
 * @param {number[]} center - [latitude, longitude] for the initial center
 * @param {number} zoom - Initial zoom level
 * @returns {L.Map} Leaflet map instance
 */
export function initializeMap(elementId, center, zoom = 4) {
    const map = L.map(elementId).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    return map;
}

/**
 * Add a marker to the map.
 * @param {L.Map} map - Leaflet map instance
 * @param {number[]} position - [latitude, longitude]
 * @param {L.Icon} icon - Leaflet icon to use
 * @param {string} popupContent - HTML content for the popup
 * @param {boolean} openPopup - Whether to open the popup immediately
 * @returns {L.Marker} Leaflet marker instance
 */
export function addMarker(map, position, icon, popupContent, openPopup = false) {
    const marker = L.marker(position, { icon })
        .addTo(map)
        .bindPopup(popupContent);

    if (openPopup) {
        marker.openPopup();
    }

    return marker;
}
