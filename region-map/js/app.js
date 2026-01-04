/**
 * Main application entry point
 * Roblox Closest Region Finder
 */

import { regions } from '../data/regions.js';
import { calculateDistance, kmToMiles } from './utils.js';
import { createIcon, initializeMap, addMarker } from './map.js';
import { showError, showLoading, hideLoading, createRegionListItem } from './ui.js';

// DOM element references
const elements = {
    loading: document.getElementById('loading'),
    errorContainer: document.getElementById('error-container'),
    regionList: document.getElementById('region-list')
};

// Map marker icons
const icons = {
    user: createIcon('red'),
    region: createIcon('blue')
};

/**
 * Calculate distances from user location to all regions.
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @returns {Object[]} Regions sorted by distance with distance data
 */
function calculateRegionDistances(userLat, userLon) {
    return regions
        .map(region => {
            const distanceKm = calculateDistance(userLat, userLon, region.lat, region.lon);
            return {
                ...region,
                distanceKm,
                distanceMiles: kmToMiles(distanceKm)
            };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Render region markers on the map and items in the list.
 * @param {L.Map} map - Leaflet map instance
 * @param {Object[]} sortedRegions - Regions sorted by distance
 */
function renderRegions(map, sortedRegions) {
    sortedRegions.forEach((region, index) => {
        // Add list item
        const listItem = createRegionListItem(region, index, () => {
            map.setView([region.lat, region.lon], 6);
        });
        elements.regionList.appendChild(listItem);

        // Add map marker
        addMarker(
            map,
            [region.lat, region.lon],
            icons.region,
            `<strong>${region.name}</strong><br>${region.distanceKm.toFixed(0)} km away`
        );
    });
}

/**
 * Handle successful geolocation.
 * @param {GeolocationPosition} position - The user's position
 */
function handleGeolocationSuccess(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    const userLocation = [userLat, userLon];

    try {
        // Initialize map centered on user
        const map = initializeMap('map', userLocation);

        // Add user marker
        addMarker(map, userLocation, icons.user, 'Your Location', true);

        // Calculate and display regions
        const sortedRegions = calculateRegionDistances(userLat, userLon);
        renderRegions(map, sortedRegions);

    } catch (error) {
        showError(elements.errorContainer, 'Error initializing map. Please refresh the page.');
        console.error('Map initialization error:', error);
    }

    hideLoading(elements.loading);
}

/**
 * Handle geolocation error.
 * @param {GeolocationPositionError} error - The geolocation error
 */
function handleGeolocationError(error) {
    hideLoading(elements.loading);
    showError(
        elements.errorContainer,
        'Unable to retrieve your location. Please check your browser settings and try again.'
    );
    console.error('Geolocation error:', error);
}

/**
 * Initialize the application.
 */
function init() {
    showLoading(elements.loading);

    if (!navigator.geolocation) {
        hideLoading(elements.loading);
        showError(elements.errorContainer, 'Geolocation is not supported by this browser.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        handleGeolocationSuccess,
        handleGeolocationError
    );
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
