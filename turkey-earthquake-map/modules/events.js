// modules/events.js
import * as dom from './dom.js';
import { state, setMinMagnitude, setMaxDepth, setStartDate, setEndDate, setCurrentSource, setCurrentView } from './state.js';
import { fetchEarthquakes } from './api.js';
import { applyFiltersAndDisplay } from './filters.js';
import { updateDataSourceUI } from './ui.js';
import { toggleTheme, initializeTheme } from './theme.js';

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
      applyFiltersAndDisplay();
    });

    // Source Radio Button Change
    dom.sourceRadioGroup.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                setCurrentSource(e.target.value);
                updateDataSourceUI();
                fetchEarthquakes();
            }
        });
    });

    // Theme Toggle Button Click
    dom.themeToggleButton.addEventListener('click', toggleTheme);

    // Click Listener for List Items (Event Delegation) - AOE removed
    dom.earthquakeListContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.earthquake-card');
        if (!card) return;
        const quakeId = card.dataset.quakeId;
        if (!quakeId) return;
        const quakeData = state.allEarthquakes.find(q => q.id === quakeId);
        if (!quakeData) return;
        const lat = quakeData.lat;
        const lon = quakeData.lon;
        if (lat == null || lon == null) return;

        if (state.currentView !== 'map') {
            dom.viewToggleSwitch.checked = true;
            // Manually trigger change event to ensure view switch logic runs
            dom.viewToggleSwitch.dispatchEvent(new Event('change'));
            setTimeout(() => {
                // Check map is initialized *after* potential view switch
                if (state.mapInitialized && state.map) {
                     state.map.flyTo([lat, lon], Math.max(state.map.getZoom(), 8));
                }
            }, 200); // Delay allows map init/display
        } else {
             if(state.map) state.map.flyTo([lat, lon], Math.max(state.map.getZoom(), 8));
        }
    });
}

// Initial setup function
export function initializeApp() {
    initializeTheme(); // Initialize theme FIRST
    // Set initial filter display values
    dom.magnitudeValueSpan.textContent = parseFloat(dom.magnitudeRange.value).toFixed(1);
    dom.depthValueSpan.textContent = parseInt(dom.depthRange.value, 10);
    // Set initial state values from DOM defaults
    setMinMagnitude(parseFloat(dom.magnitudeRange.value));
    setMaxDepth(parseInt(dom.depthRange.value, 10));

    updateDataSourceUI(); // Set initial source indicator text/highlight
    setupEventListeners(); // Attach all listeners
    fetchEarthquakes(); // Fetch initial data (map init happens inside if needed)
}
