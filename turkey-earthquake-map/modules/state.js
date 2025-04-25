// modules/state.js
// Application State Management

export const state = {
    allEarthquakes: [], // Holds the *standardized* earthquake data
    currentFilters: {
        minMagnitude: 1.0, // Initialize with default slider value
        maxDepth: 700,   // Initialize with default slider value
        startDate: null,
        endDate: null,
    },
    map: null, // Leaflet map instance L.map()
    earthquakeLayer: null, // Leaflet layer group L.layerGroup() for markers
    mapInitialized: false,
    currentView: "list", // 'list' or 'map'
    currentSource: "usgs", // 'usgs' or 'kandilli'
    currentTheme: 'light', // Add current theme state ('light' or 'dark')
    tileLayerInstance: null, // Add instance for the current L.tileLayer
};

// --- Filter State Setters ---
export function setMinMagnitude(value) {
    state.currentFilters.minMagnitude = value;
}

export function setMaxDepth(value) {
    state.currentFilters.maxDepth = value;
}

export function setStartDate(value) {
    state.currentFilters.startDate = value;
}

export function setEndDate(value) {
    state.currentFilters.endDate = value;
}

// --- Source & View State Setters ---
export function setCurrentSource(value) {
    state.currentSource = value;
}

export function setCurrentView(value) {
    state.currentView = value;
}

// --- Data State Setter ---
export function setAllEarthquakes(data) {
    state.allEarthquakes = data;
}

// --- Map State Setters ---
export function setMapInstance(mapInstance) {
    state.map = mapInstance;
}

export function setEarthquakeLayer(layer) {
    state.earthquakeLayer = layer;
}

export function setMapInitialized(value) {
    state.mapInitialized = value;
}

export function setTileLayerInstance(layer) {
    state.tileLayerInstance = layer;
}

// --- Theme State Setter ---
export function setCurrentTheme(theme) {
    state.currentTheme = theme;
}
