// Event Listener Setup
import * as dom from './dom.js';
import { state, setMinMagnitude, setMaxDepth, setStartDate, setEndDate, setCurrentSource, setCurrentView } from './state.js';
import { fetchEarthquakes } from './api.js';
import { applyFiltersAndDisplay } from './filters.js';
import { updateDataSourceUI } from './ui.js';

export function setupEventListeners() {
    // Filter Changes
    dom.magnitudeRange.addEventListener("input", (e) => { dom.magnitudeValueSpan.textContent = parseFloat(e.target.value).toFixed(1); });
    dom.magnitudeRange.addEventListener("change", (e) => { setMinMagnitude(parseFloat(e.target.value)); applyFiltersAndDisplay(); });

    dom.depthRange.addEventListener("input", (e) => { dom.depthValueSpan.textContent = parseInt(e.target.value, 10); });
    dom.depthRange.addEventListener("change", (e) => { setMaxDepth(parseFloat(e.target.value)); applyFiltersAndDisplay(); });

    dom.startDateInput.addEventListener("change", (e) => { setStartDate(e.target.value ? e.target.value : null); applyFiltersAndDisplay(); });
    dom.endDateInput.addEventListener("change", (e) => { setEndDate(e.target.value ? e.target.value : null); applyFiltersAndDisplay(); });

    // View Toggle Change
    dom.viewToggleSwitch.addEventListener("change", (e) => {
      const newView = e.target.checked ? "map" : "list";
      setCurrentView(newView);
      dom.listView.classList.toggle("d-none", newView === "map");
      dom.mapView.classList.toggle("d-none", newView === "list");
      applyFiltersAndDisplay(); // Re-render in the new view
    });

    // Source Radio Button Change (using event delegation on the group is possible, but direct listeners are fine here)
    dom.sourceRadioGroup.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                setCurrentSource(e.target.value); // Update state
                updateDataSourceUI(); // Update UI indicator
                fetchEarthquakes(); // Fetch data from the new source
            }
        });
    });


    // Click Listener for List Items (Event Delegation)
    dom.earthquakeListContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.earthquake-card');
        if (!card) return;
        const quakeId = card.dataset.quakeId;
        if (!quakeId) return;

        const quakeData = state.allEarthquakes.find(q => q.id === quakeId);
        if (!quakeData) return;

        const lat = quakeData.lat;
        const lon = quakeData.lon;
        const magnitude = quakeData.mag;

        if (lat == null || lon == null || magnitude == null) return;

        if (state.currentView !== 'map') {
            dom.viewToggleSwitch.checked = true;
            dom.viewToggleSwitch.dispatchEvent(new Event('change')); // Trigger view switch
            setTimeout(() => {
                if (state.mapInitialized) {
                     if(state.map) state.map.flyTo([lat, lon], Math.max(state.map.getZoom(), 8)); // Use state.map
                }
            }, 200);
        } else {
             if(state.map) state.map.flyTo([lat, lon], Math.max(state.map.getZoom(), 8)); // Use state.map
        }
    });
}

// Initial setup function
export function initializeApp() {
    // Set initial filter display values
    dom.magnitudeValueSpan.textContent = parseFloat(dom.magnitudeRange.value).toFixed(1);
    dom.depthValueSpan.textContent = parseInt(dom.depthRange.value, 10);
    // Set initial state values from DOM defaults
    setMinMagnitude(parseFloat(dom.magnitudeRange.value));
    setMaxDepth(parseInt(dom.depthRange.value, 10));

    updateDataSourceUI(); // Set initial source indicator
    setupEventListeners(); // Attach all listeners
    fetchEarthquakes(); // Fetch initial data
}
