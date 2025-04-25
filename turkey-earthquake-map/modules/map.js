// modules/map.js

// REMOVE THIS LINE: import * as L from 'leaflet'; // Import Leaflet library (assuming it's globally available or installed)

// Keep the rest of the imports
import { state, setMapInstance, setEarthquakeLayer, setAoeLayer, setMapInitialized } from './state.js';
import * as dom from './dom.js';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION } from './config.js';
import { showError } from './ui.js'; // Import error display

/** Initializes the Leaflet map. */
export function initializeMap() {
  if (state.mapInitialized) return;
  try {
    // Use the global L directly
    const mapInstance = L.map(dom.mapElement).setView(MAP_CENTER, MAP_ZOOM);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(mapInstance);
    setMapInstance(mapInstance);
    setEarthquakeLayer(L.layerGroup().addTo(mapInstance));
    setAoeLayer(L.layerGroup().addTo(mapInstance));
    setMapInitialized(true);
    console.log("Map initialized");

    mapInstance.on('click', () => {
        if (state.aoeLayer) {
            state.aoeLayer.clearLayers();
        }
    });

  } catch (error) {
    console.error("Failed to initialize map:", error);
    showError("Harita başlatılamadı. Sayfayı yenilemeyi deneyin.");
    setMapInitialized(false);
  }
}

// ... rest of the functions in map.js remain the same ...
// (getMagnitudeColor, getMagnitudeRadius, calculateAoeRadius, showAoeOnMap)
// They already correctly use the global L variable implicitly.

/** Gets a color based on earthquake magnitude. */
export function getMagnitudeColor(magnitude) {
  if (magnitude < 3) return "#66BB6A"; if (magnitude < 4) return "#FFEE58"; if (magnitude < 5) return "#FFA726"; if (magnitude < 6) return "#FF7043"; return "#EF5350";
}

/** Gets a radius size based on earthquake magnitude for map markers. */
export function getMagnitudeRadius(magnitude) {
  return Math.max(Math.pow(magnitude, 1.8) * 1.5, 5);
}
