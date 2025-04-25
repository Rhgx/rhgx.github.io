// modules/theme.js
import * as dom from './dom.js';
import { state, setCurrentTheme } from './state.js';
import { updateMapTheme } from './map.js';

// anime will be available globally via CDN script tag

const THEME_STORAGE_KEY = 'earthquake_tracker_theme';

/** Gets the preferred theme from storage or OS preference. */
function getPreferredTheme() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) { return storedTheme; }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Updates the theme button icon with animation. */
function updateThemeButtonIcon(theme, animate = false) {
    const newIcon = theme === 'dark' ? 'light_mode' : 'dark_mode'; // sun for dark, moon for light
    const iconElement = dom.themeToggleIcon;

    if (!iconElement) return;

    if (!animate || typeof anime === 'undefined') {
        iconElement.textContent = newIcon;
        return;
    }

    // --- Faster, Lighter Animation ---
    anime.timeline({
        targets: iconElement,
        // Shorter duration
        duration: 150,
        easing: 'easeOutQuad' // A slightly snappier easing
    })
    .add({
        // Animate out (scale down and fade)
        scale: 0.5, // Don't scale down completely
        opacity: 0,
        // Removed rotate
        complete: () => {
            iconElement.textContent = newIcon;
        }
    })
    .add({
        // Animate in (scale up and fade)
        scale: 1,
        opacity: 1,
        delay: 30 // Shorter delay
    });
    // --- End Animation Update ---
}


/** Applies the theme to the HTML element and updates state/storage. */
export function applyTheme(theme, animateButton = false) {
    dom.htmlElement.setAttribute('data-bs-theme', theme);
    setCurrentTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateThemeButtonIcon(theme, animateButton);
    if (state.mapInitialized) {
        updateMapTheme();
    }
    console.log(`Theme applied: ${theme}`);
}

/** Toggles between light and dark themes. */
export function toggleTheme() {
    const newTheme = state.currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme, true);
}

/** Initializes the theme on application load. */
export function initializeTheme() {
    const initialTheme = getPreferredTheme();
    setCurrentTheme(initialTheme);
    applyTheme(initialTheme, false); // No animation on initial load

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        const newColorScheme = event.matches ? "dark" : "light";
        console.log(`OS color scheme changed to: ${newColorScheme}. Applying theme.`);
        applyTheme(newColorScheme, true); // Animate if OS changes
    });
}
