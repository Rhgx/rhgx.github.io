// Application State Management

export const state = {
    allEarthquakes: [], // Holds the *standardized* earthquake data
    currentFilters: {
        minMagnitude: 1.0, // Initialize with default slider value
        maxDepth: 700,   // Initialize with default slider value
        startDate: null,
        endDate: null,
    },
    map: null,
    earthquakeLayer: null,
    mapInitialized: false,
    currentView: "list", // 'list' or 'map'
    currentSource: "usgs", // 'usgs' or 'kandilli'
};

// Function to update magnitude filter (example of state mutation)
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

export function setCurrentSource(value) {
    state.currentSource = value;
}

export function setCurrentView(value) {
    state.currentView = value;
}

export function setAllEarthquakes(data) {
    state.allEarthquakes = data;
}

export function setMapInstance(mapInstance) {
    state.map = mapInstance;
}

export function setEarthquakeLayer(layer) {
    state.earthquakeLayer = layer;
}

export function setAoeLayer(layer) {
    state.aoeLayer = layer;
}

export function setMapInitialized(value) {
    state.mapInitialized = value;
}
