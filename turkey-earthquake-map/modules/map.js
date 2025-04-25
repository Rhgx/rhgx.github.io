// modules/map.js
import { state, setMapInstance, setEarthquakeLayer, setMapInitialized, setTileLayerInstance } from './state.js';
import * as dom from './dom.js';
import { MAP_CENTER, MAP_ZOOM, TILE_URL_LIGHT, TILE_ATTRIBUTION_LIGHT, TILE_URL_DARK, TILE_ATTRIBUTION_DARK } from './config.js';
import { showError } from './ui.js';

/** Initializes the Leaflet map. */
export function initializeMap() {
  if (state.mapInitialized) return;
  try {
    // Use global L provided by the script tag
    const mapInstance = L.map(dom.mapElement).setView(MAP_CENTER, MAP_ZOOM);
    setMapInstance(mapInstance);

    // Set initial tile layer based on current theme
    const initialTileUrl = state.currentTheme === 'dark' ? TILE_URL_DARK : TILE_URL_LIGHT;
    const initialAttribution = state.currentTheme === 'dark' ? TILE_ATTRIBUTION_DARK : TILE_ATTRIBUTION_LIGHT;
    const initialLayer = L.tileLayer(initialTileUrl, { attribution: initialAttribution });
    initialLayer.addTo(mapInstance);
    setTileLayerInstance(initialLayer); // Store the layer instance

    setEarthquakeLayer(L.layerGroup().addTo(mapInstance));
    setMapInitialized(true);
    console.log("Map initialized with theme:", state.currentTheme);

    // Removed AOE map click listener

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

    // Remove the current tile layer
    state.map.removeLayer(state.tileLayerInstance);

    // Determine new theme details
    const newTileUrl = state.currentTheme === 'dark' ? TILE_URL_DARK : TILE_URL_LIGHT;
    const newAttribution = state.currentTheme === 'dark' ? TILE_ATTRIBUTION_DARK : TILE_ATTRIBUTION_LIGHT;

    // Create and add the new tile layer
    const newLayer = L.tileLayer(newTileUrl, { attribution: newAttribution });
    newLayer.addTo(state.map);

    // Update the stored layer instance
    setTileLayerInstance(newLayer);
    console.log("Map theme updated to:", state.currentTheme);
}

/** Gets a color based on earthquake magnitude using Bootstrap variable names (or hex). */
export function getMagnitudeColor(magnitude) {
  // Using hex codes directly for consistency
  if (magnitude === null || magnitude < 0) return "#868e96"; // gray-600
  if (magnitude < 3) return "#198754"; // success
  if (magnitude < 4.5) return "#ffc107"; // warning
  return "#dc3545"; // danger
}

/** Gets a radius size based on earthquake magnitude for map markers. */
export function getMagnitudeRadius(magnitude) {
  if (magnitude === null || magnitude < 0) return 5; // Default size for unknown
  return Math.max(Math.pow(magnitude, 1.8) * 1.5, 5);
}

// AOE functions were removed previously
