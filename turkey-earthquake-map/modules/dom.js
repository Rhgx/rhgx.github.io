// modules/dom.js
// DOM Element References

export const htmlElement = document.documentElement; // Add HTML element
export const themeToggleButton = document.getElementById("themeToggleButton"); // Add Theme button
export const themeToggleIcon = document.getElementById("themeToggleIcon"); // Add Theme button icon

export const earthquakeListContainer = document.getElementById("earthquake-list");
export const listView = document.getElementById("list-view");
export const mapView = document.getElementById("map-view");
export const mapElement = document.getElementById("map");
export const loadingIndicator = document.getElementById("loading");
export const errorContainer = document.getElementById("error");
export const magnitudeRange = document.getElementById("magnitudeRange");
export const magnitudeValueSpan = document.getElementById("magnitudeValue");
export const depthRange = document.getElementById("depthRange");
export const depthValueSpan = document.getElementById("depthValue");
export const startDateInput = document.getElementById("startDate");
export const endDateInput = document.getElementById("endDate");
export const viewToggleSwitch = document.getElementById("viewToggleSwitch");
export const sourceUsgsRadio = document.getElementById("sourceUsgs");
export const sourceKandilliRadio = document.getElementById("sourceKandilli");
export const sourceRadioGroup = document.querySelectorAll('input[name="sourceOptions"]');
export const dataSourceIndicator = document.getElementById("dataSourceIndicator");
export const noResultsList = document.getElementById("no-results-list");
export const noResultsMap = document.getElementById("no-results-map");
export const attributionText = document.getElementById("attributionText");
export const usgsLink = document.getElementById("usgsLink");
export const kandilliLink = document.getElementById("kandilliLink");
