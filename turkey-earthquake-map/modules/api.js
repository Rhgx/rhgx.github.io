import { state, setAllEarthquakes } from './state.js';
import { USGS_API_URL, KANDILLI_API_URL } from './config.js';
import { showLoading, showError } from './ui.js'; 
import { applyFiltersAndDisplay } from './filters.js';

function parseUsgsData(usgsData) {
    if (!usgsData || !usgsData.features) return [];
    return usgsData.features.map(feature => {
        const props = feature.properties;
        const coords = feature.geometry.coordinates;
        if (!coords || coords.length < 3 || typeof coords[1] !== 'number' || typeof coords[0] !== 'number' || typeof coords[2] !== 'number' || typeof props.time !== 'number') {
            console.warn("Skipping invalid USGS feature:", feature); return null;
        }
        return { id: feature.id, lat: coords[1], lon: coords[0], depth: coords[2] >= 0 ? coords[2] : 0, mag: props.mag, time: props.time, locationString: props.place, url: props.url, source: 'usgs' };
    }).filter(item => item !== null);
}

function parseKandilliData(kandilliData) {
     if (!kandilliData || !kandilliData.result) return [];
    return kandilliData.result.map(item => {
        let timeMs = null;
        if (item.created_at && typeof item.created_at === 'number') { timeMs = item.created_at * 1000; }
        else if (item.date_time && typeof item.date_time === 'string') {
            try { const isoLikeString = item.date_time.replace(' ', 'T'); timeMs = new Date(isoLikeString).getTime(); if (isNaN(timeMs)) { console.warn("Failed to parse Kandilli date_time:", item.date_time); timeMs = Date.now(); } }
            catch (e) { console.warn("Error parsing Kandilli date_time:", item.date_time, e); timeMs = Date.now(); }
        } else { timeMs = Date.now(); }

        if (!item.geojson?.coordinates || item.geojson.coordinates.length < 2 || typeof item.geojson.coordinates[1] !== 'number' || typeof item.geojson.coordinates[0] !== 'number' || typeof item.depth !== 'number' || typeof item.mag !== 'number') {
             console.warn("Skipping invalid Kandilli item:", item); return null;
        }
        return { id: item.earthquake_id || item._id, lat: item.geojson.coordinates[1], lon: item.geojson.coordinates[0], depth: item.depth >= 0 ? item.depth : 0, mag: item.mag, time: timeMs, locationString: item.title, url: null, source: 'kandilli' };
    }).filter(item => item !== null);
}

export async function fetchEarthquakes() {
  showLoading(true);
  showError(null);

  const apiUrl = state.currentSource === 'kandilli' ? KANDILLI_API_URL : USGS_API_URL;
  console.log(`Fetching data from: ${state.currentSource.toUpperCase()}`);

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API Hatası (${state.currentSource.toUpperCase()}): ${response.status} ${response.statusText}`);
    }
    const rawData = await response.json();

    let parsedData = [];
    if (state.currentSource === 'kandilli') {
        parsedData = parseKandilliData(rawData);
    } else {
        parsedData = parseUsgsData(rawData);
    }
    setAllEarthquakes(parsedData);

    console.log(`Parsed ${state.allEarthquakes.length} earthquakes from ${state.currentSource.toUpperCase()}`);
    applyFiltersAndDisplay();

  } catch (err) {
    console.error(`Deprem verileri (${state.currentSource.toUpperCase()}) alınamadı:`, err);
    showError(`Deprem verileri (${state.currentSource.toUpperCase()}) yüklenemedi. Lütfen daha sonra tekrar deneyin veya kaynağı değiştirin. (${err.message})`);
    setAllEarthquakes([]);
    applyFiltersAndDisplay();
  } finally {
    showLoading(false);
  }
}
