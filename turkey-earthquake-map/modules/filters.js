import { state } from './state.js';
import { displayEarthquakesOnList, displayEarthquakesOnMap } from './ui.js';
import { initializeMap } from './map.js';

/** Gets the start/end timestamps from date inputs for filtering. */
export function getDateFilterTimestamps() {
    let startTimestamp = null;
    let endTimestamp = null;
    if (state.currentFilters.startDate) {
        const startDate = new Date(state.currentFilters.startDate);
        startDate.setHours(0, 0, 0, 0);
        startTimestamp = startDate.getTime();
    }
    if (state.currentFilters.endDate) {
        const endDate = new Date(state.currentFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        endTimestamp = endDate.getTime();
    }
    return { startTimestamp, endTimestamp };
}

/** Filters earthquakes based on current state and updates the display. */
export function applyFiltersAndDisplay() {
  const { startTimestamp, endTimestamp } = getDateFilterTimestamps();

  const filteredEarthquakes = state.allEarthquakes.filter((quake) => {
    const magnitude = quake.mag !== null ? quake.mag : -1;
    const quakeDepth = quake.depth >= 0 ? quake.depth : Infinity;
    const quakeTime = quake.time;

    if (magnitude < state.currentFilters.minMagnitude) return false;
    if (quakeDepth > state.currentFilters.maxDepth) return false;
    if (startTimestamp && quakeTime < startTimestamp) return false;
    if (endTimestamp && quakeTime > endTimestamp) return false;

    return true;
  });

  if (state.currentView === "list") {
    displayEarthquakesOnList(filteredEarthquakes);
  } else if (state.currentView === "map") {
    if (!state.mapInitialized) initializeMap(); // Ensure map is ready
    if (state.mapInitialized) { // Check again after potential init
      displayEarthquakesOnMap(filteredEarthquakes);
      // Invalidate map size after rendering
      requestAnimationFrame(() => { if (state.map) state.map.invalidateSize(); });
    }
  }
}
