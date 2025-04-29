// modules/map.js
import { state, setMapInstance, setEarthquakeLayer, setMapInitialized, setTileLayerInstance, setFaultLayer } from './state.js';
import * as dom from './dom.js';
import { MAP_CENTER, MAP_ZOOM, TILE_URL_LIGHT, TILE_ATTRIBUTION_LIGHT, TILE_URL_DARK, TILE_ATTRIBUTION_DARK, MIN_LAT, MAX_LAT, MIN_LON, MAX_LON, FAULT_BUFFER_DEGREES } from './config.js'; // Import bounds and buffer
import { showError } from './ui.js';

/**
 * Checks if a GeoJSON feature (LineString) is near Turkey's bounding box.
 * @param {object} feature - The GeoJSON feature.
 * @returns {boolean} - True if the feature is near Turkey, false otherwise.
 */
function isFaultNearTurkey(feature) {
    if (!feature || !feature.geometry) {
        return false;
    }

    const geom = feature.geometry;
    const buffer = FAULT_BUFFER_DEGREES; // Use buffer from config

    // Define the buffered bounding box
    const minLatBuffered = MIN_LAT - buffer;
    const maxLatBuffered = MAX_LAT + buffer;
    const minLonBuffered = MIN_LON - buffer;
    const maxLonBuffered = MAX_LON + buffer;

    // Check based on geometry type
    if (geom.type === 'LineString') {
        // Check if *any* point in the LineString falls within the buffered box
        return geom.coordinates.some(coord => {
            const lon = coord[0];
            const lat = coord[1];
            return lat >= minLatBuffered && lat <= maxLatBuffered &&
                   lon >= minLonBuffered && lon <= maxLonBuffered;
        });
    } else if (geom.type === 'MultiLineString') {
         // Check if *any* point in *any* LineString falls within the buffered box
         return geom.coordinates.some(line =>
             line.some(coord => {
                 const lon = coord[0];
                 const lat = coord[1];
                 return lat >= minLatBuffered && lat <= maxLatBuffered &&
                        lon >= minLonBuffered && lon <= maxLonBuffered;
             })
         );
    }

    // Add checks for other geometry types (Point, Polygon) if needed,
    // otherwise ignore them for fault lines.
    return false; // Ignore unsupported geometry types
}


/** Fetches and displays fault lines from a local GeoJSON file, filtering for Turkey */
async function loadAndDisplayFaultLines() {
    if (!state.map) {
        console.warn("Map not ready for fault lines.");
        return;
    }
    try {
        const response = await fetch('./faults.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error loading faults.geojson! status: ${response.status}`);
        }
        const faultData = await response.json();

        const faultStyle = {
            color: "#FF0000", // Red color
            weight: 1.5,
            opacity: 0.65 // Slightly more transparent
        };

        // --- Use Leaflet's filter option ---
        const layer = L.geoJSON(faultData, {
            style: faultStyle,
            filter: isFaultNearTurkey // Apply the filter function here
        });
        // --- End filter option ---

        setFaultLayer(layer);
        layer.addTo(state.map);
        console.log("Filtered fault lines loaded and displayed.");

    } catch (error) {
        console.error("Could not load or display fault lines:", error);
    }
}


/** Initializes the Leaflet map. */
export function initializeMap() {
  if (state.mapInitialized) return;
  try {
    const mapInstance = L.map(dom.mapElement).setView(MAP_CENTER, MAP_ZOOM);
    setMapInstance(mapInstance);

    const initialTileUrl = state.currentTheme === 'dark' ? TILE_URL_DARK : TILE_URL_LIGHT;
    const initialAttribution = state.currentTheme === 'dark' ? TILE_ATTRIBUTION_DARK : TILE_ATTRIBUTION_LIGHT;
    const initialLayer = L.tileLayer(initialTileUrl, { attribution: initialAttribution });
    initialLayer.addTo(mapInstance);
    setTileLayerInstance(initialLayer);

    setEarthquakeLayer(L.layerGroup().addTo(mapInstance));
    setMapInitialized(true);
    console.log("Map initialized with theme:", state.currentTheme);

    loadAndDisplayFaultLines(); // Load faults after map init

  } catch (error) {
    console.error("Failed to initialize map:", error);
    showError("Harita başlatılamadı. Sayfayı yenilemeyi deneyin.");
    setMapInitialized(false);
  }
}

/** Updates the map's tile layer based on the current theme state. */
export function updateMapTheme() {
    if (!state.map || !state.tileLayerInstance) {
        console.warn("Map or tile layer not initialized, cannot update theme.");
        return;
    }
    state.map.removeLayer(state.tileLayerInstance);
    const newTileUrl = state.currentTheme === 'dark' ? TILE_URL_DARK : TILE_URL_LIGHT;
    const newAttribution = state.currentTheme === 'dark' ? TILE_ATTRIBUTION_DARK : TILE_ATTRIBUTION_LIGHT;
    const newLayer = L.tileLayer(newTileUrl, { attribution: newAttribution });
    newLayer.addTo(state.map);
    setTileLayerInstance(newLayer);

    // --- Re-apply fault lines if they exist (optional, but good practice) ---
    // This ensures they stay on top if the tile layer order changes things.
    if (state.faultLayer) {
        state.faultLayer.bringToFront();
    }
    // --- End re-apply ---

    console.log("Map theme updated to:", state.currentTheme);
}

/** Gets a color based on earthquake magnitude using hex codes. */
export function getMagnitudeColor(magnitude) {
  if (magnitude === null || magnitude < 0) return "#868e96"; // gray-600
  if (magnitude < 3) return "#198754"; // success
  if (magnitude < 4.5) return "#ffc107"; // warning
  return "#dc3545"; // danger
}

/** Gets a radius size based on earthquake magnitude for map markers. */
export function getMagnitudeRadius(magnitude) {
  if (magnitude === null || magnitude < 0) return 5;
  return Math.max(Math.pow(magnitude, 1.8) * 1.5, 5);
}
