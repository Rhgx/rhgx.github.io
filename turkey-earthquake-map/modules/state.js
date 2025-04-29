// modules/state.js
// Application State Management

export const state = {
    allEarthquakes: [],
    currentFilters: {
        minMagnitude: 1.0,
        maxDepth: 700,
        startDate: null,
        endDate: null,
    },
    map: null,
    earthquakeLayer: null,
    faultLayer: null, // Add state for the fault layer
    mapInitialized: false,
    currentView: "list",
    currentSource: "usgs",
    currentTheme: 'light',
    tileLayerInstance: null,
};

// --- Filter State Setters ---
export function setMinMagnitude(value) { state.currentFilters.minMagnitude = value; }
export function setMaxDepth(value) { state.currentFilters.maxDepth = value; }
export function setStartDate(value) { state.currentFilters.startDate = value; }
export function setEndDate(value) { state.currentFilters.endDate = value; }

// --- Source & View State Setters ---
export function setCurrentSource(value) { state.currentSource = value; }
export function setCurrentView(value) { state.currentView = value; }

// --- Data State Setter ---
export function setAllEarthquakes(data) { state.allEarthquakes = data; }

// --- Map State Setters ---
export function setMapInstance(mapInstance) { state.map = mapInstance; }
export function setEarthquakeLayer(layer) { state.earthquakeLayer = layer; }
export function setFaultLayer(layer) { state.faultLayer = layer; } // Add setter for fault layer
export function setMapInitialized(value) { state.mapInitialized = value; }
export function setTileLayerInstance(layer) { state.tileLayerInstance = layer; }

// --- Theme State Setter ---
export function setCurrentTheme(theme) { state.currentTheme = theme; }
