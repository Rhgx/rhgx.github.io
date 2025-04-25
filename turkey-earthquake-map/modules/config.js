// modules/config.js

// API and Map Configuration Constants

// Approximate bounding box for Türkiye (used by USGS)
export const MIN_LAT = 35.5;
export const MAX_LAT = 42.5;
export const MIN_LON = 25.5;
export const MAX_LON = 45.0;

export const LIMIT = 100; // Max earthquakes to fetch

// API URLs
export const USGS_API_URL = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=${LIMIT}&minlatitude=${MIN_LAT}&maxlatitude=${MAX_LAT}&minlongitude=${MIN_LON}&maxlongitude=${MAX_LON}&orderby=time`;
export const KANDILLI_API_URL = `https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=${LIMIT}`;

// --- Updated Map Settings for Dark Theme ---
export const MAP_CENTER = [39.0, 35.0];
export const MAP_ZOOM = 6;
// Use CARTO Dark Matter tile layer
export const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
// Update attribution to include CARTO
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
// --- End Updated Map Settings ---

// Translation Data
export const directionMap = { N: "K", S: "G", E: "D", W: "B", NE: "KD", SE: "GD", SW: "GB", NW: "KB", NNE: "KKD", ENE: "DKD", ESE: "DGD", SSE: "GGD", SSW: "GGB", WSW: "BGB", WNW: "BKB", NNW: "KKB" };
export const countryMap = { Turkey: "Türkiye", Greece: "Yunanistan", Georgia: "Gürcistan", Armenia: "Ermenistan", Azerbaijan: "Azerbaycan", Iran: "İran", Iraq: "Irak", Syria: "Suriye", Bulgaria: "Bulgaristan", Cyprus: "Kıbrıs", "Dodecanese Islands, Greece": "Oniki Adalar, Yunanistan" };

