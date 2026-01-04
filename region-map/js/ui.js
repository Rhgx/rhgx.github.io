/**
 * UI-related functions for the Region Finder application
 */

/**
 * Show an error message in the specified container.
 * @param {HTMLElement} container - The container element
 * @param {string} message - The error message to display
 */
export function showError(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

/**
 * Show the loading indicator.
 * @param {HTMLElement} element - The loading element
 */
export function showLoading(element) {
    element.style.display = 'block';
}

/**
 * Hide the loading indicator.
 * @param {HTMLElement} element - The loading element
 */
export function hideLoading(element) {
    element.style.display = 'none';
}

/**
 * Create a region list item element.
 * @param {Object} region - The region data
 * @param {number} index - The region's ranking index
 * @param {Function} onClick - Click handler for the list item
 * @returns {HTMLLIElement} The list item element
 */
export function createRegionListItem(region, index, onClick) {
    const listItem = document.createElement('li');
    listItem.classList.add('list-group-item');
    listItem.innerHTML = `
        <strong>${index + 1}. ${region.name}</strong><br>
        ${region.distanceKm.toFixed(0)} km (${region.distanceMiles.toFixed(0)} miles)
    `;
    listItem.addEventListener('click', onClick);
    return listItem;
}
