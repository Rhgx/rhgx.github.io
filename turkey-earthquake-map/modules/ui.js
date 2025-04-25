// modules/ui.js
import * as dom from './dom.js';
import { state } from './state.js';
import { countryMap, directionMap } from './config.js';
// Import map helpers needed for displayEarthquakesOnMap AND badge colors
import { getMagnitudeColor, getMagnitudeRadius } from './map.js';

/** Formats timestamp to Turkish locale string (e.g., "23 Nis 2025 12:49") */
export function formatTime(timestamp) {
  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    console.warn("Invalid timestamp received:", timestamp);
    return "Geçersiz Zaman";
  }
  // Use specific options for the desired format
  const options = {
    day: 'numeric',     // 23
    month: 'short',     // Nis
    year: 'numeric',    // 2025
    hour: 'numeric',    // 12
    minute: 'numeric',  // 49
    hour12: false       // Use 24-hour clock
  };
  return new Date(timestamp).toLocaleString("tr-TR", options);
}

/**
 * Formats a timestamp into a relative time string (e.g., "5 dakika önce").
 */
function formatRelativeTime(timestamp) {
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
        return ""; // Return empty for invalid input
    }
    const now = Date.now();
    const secondsPast = Math.floor((now - timestamp) / 1000);

    if (secondsPast < 60) {
        // Handle pluralization for seconds if needed, though usually just "X saniye"
        return `${secondsPast} saniye önce`;
    }
    const minutesPast = Math.floor(secondsPast / 60);
    if (minutesPast < 60) {
        return minutesPast === 1 ? `1 dakika önce` : `${minutesPast} dakika önce`;
    }
    const hoursPast = Math.floor(minutesPast / 60);
    if (hoursPast < 24) {
        return hoursPast === 1 ? `1 saat önce` : `${hoursPast} saat önce`;
    }
    const daysPast = Math.floor(hoursPast / 24);
    if (daysPast < 7) {
        return daysPast === 1 ? `1 gün önce` : `${daysPast} gün önce`;
    }
    const weeksPast = Math.floor(daysPast / 7);
     if (weeksPast < 5) { // Approx month boundary
        return weeksPast === 1 ? `1 hafta önce` : `${weeksPast} hafta önce`;
    }
    const monthsPast = Math.floor(daysPast / 30.44); // Average month length
    if (monthsPast < 12) {
        return monthsPast === 1 ? `1 ay önce` : `${monthsPast} ay önce`;
    }
    const yearsPast = Math.floor(daysPast / 365.25); // Account for leap year avg
    return yearsPast === 1 ? `1 yıl önce` : `${yearsPast} yıl önce`;
}


/**
 * Converts a string to Turkish Title Case (e.g., "ege denizi" -> "Ege Denizi", "ışık" -> "Işık").
 */
function toTurkishTitleCase(str) {
    if (!str) return "";
    return str
        .toLocaleLowerCase('tr-TR') // Convert to lowercase using Turkish rules (I -> ı)
        .split(' ')
        .map(word => {
            if (!word) return "";
            const firstChar = word.charAt(0);
            // Convert first char to uppercase using Turkish rules (i -> İ)
            const firstCharUpper = firstChar.toLocaleUpperCase('tr-TR');
            return firstCharUpper + word.slice(1);
        })
        .join(' ');
}

/** Translates location strings from either USGS or Kandilli format. */
export function translateLocationString(locationString, source) {
    if (!locationString) return "Bilinmeyen konum";
    locationString = locationString.trim();

    if (source === 'usgs') {
        // --- USGS Logic ---
        const pattern1 = /^(\d+(\.\d+)?)\s*km\s+([NSEW]+)\s+of\s+(.*?)(?:,\s*|\s+)([a-zA-Z\s,]+)$/i;
        const match1 = locationString.match(pattern1);
        if (match1) {
            const distance = match1[1]; const directionAbbr = match1[3].toUpperCase(); const placeName = match1[4].trim().replace(/,$/, ""); let countryNameEn = match1[5].trim();
            const fullPlacePlusCountry = `${placeName}, ${countryNameEn}`; if (countryMap[fullPlacePlusCountry]) { countryNameEn = fullPlacePlusCountry; }
            const turkishDirection = directionMap[directionAbbr] || directionAbbr; const countryNameTr = countryMap[countryNameEn] || countryNameEn;
            return `${placeName}, ${countryNameTr} - ${distance} km ${turkishDirection}`;
        }
        const pattern2 = /^(.*?)(?:,\s*|\s+)([a-zA-Z\s,]+)$/i;
        const match2 = locationString.match(pattern2);
        if (match2) {
            const placeName = match2[1].trim().replace(/,$/, ""); let countryNameEn = match2[2].trim();
            const fullPlacePlusCountry = `${placeName}, ${countryNameEn}`; if (countryMap[fullPlacePlusCountry]) { countryNameEn = fullPlacePlusCountry; }
            if (countryMap[countryNameEn]) {
                const countryNameTr = countryMap[countryNameEn];
                if (placeName.toLowerCase() !== countryNameEn.toLowerCase()) { return `${placeName}, ${countryNameTr}`; } else { return countryNameTr; }
            }
        }
        if (countryMap[locationString]) { return countryMap[locationString]; }
        if (locationString.toLowerCase() === "central turkey") return "Orta Türkiye"; if (locationString.toLowerCase() === "western turkey") return "Batı Türkiye"; if (locationString.toLowerCase() === "eastern turkey") return "Doğu Türkiye";
        return locationString;

    } else if (source === 'kandilli') {
        // --- Kandilli Logic ---
        const kandilliPattern = /^([^-(\s]+(?: [^-(\s]+)*)(?:-([^-(\s]+(?: [^-(\s]+)*))?(?:\s*\((.*)\))?\s*$/;
        const match = locationString.match(kandilliPattern);
        if (match) {
            const rawMain = match[1] ? match[1].trim() : '';
            const rawHyphen = match[2] ? match[2].trim() : null;
            const rawParen = match[3] ? match[3].trim() : null;

            const titleMain = toTurkishTitleCase(rawMain);
            const titleHyphen = rawHyphen ? toTurkishTitleCase(rawHyphen) : null;
            const titleParen = rawParen ? toTurkishTitleCase(rawParen) : null;

            if (titleHyphen && titleParen) {
                // Case: YENILER-SIMAV (KUTAHYA) -> Yeniler, Simav (Kütahya)
                return `${titleMain}, ${titleHyphen} (${titleParen})`;
            } else if (titleParen) {
                // Check original string to differentiate -(CITY) from (REGION)
                if (locationString.includes(`-(${rawParen})`)) {
                     // Case: TATAR-(AMASYA) -> Tatar, Amasya
                     return `${titleMain}, ${titleParen}`;
                } else {
                    // Case: KUSADASI KORFEZI (EGE DENIZI) -> Kuşadası Körfezi (Ege Denizi)
                    return `${titleMain} (${titleParen})`;
                }
            } else if (titleHyphen) {
                 // Case: Unlikely? Maybe PLACE-DISTRICT -> Place, District
                 return `${titleMain}, ${titleHyphen}`;
            } else {
                // Case: MARMARA DENIZI -> Marmara Denizi
                return titleMain;
            }
        } else {
            // Fallback if regex doesn't match
            return toTurkishTitleCase(locationString);
        }
    }

    return locationString; // Default fallback
}

/**
 * Calculates perceived brightness and returns appropriate text color (light/dark).
 */
function getTextColorForBackground(hexColor) {
    if (!hexColor || hexColor.length < 7) return '#212529'; // Default dark for invalid input
    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (r * 299 + g * 587 + b * 114) / 1000;
        return luminance >= 140 ? '#212529' : '#FFFFFF'; // Dark text on light bg, light text on dark bg
    } catch (e) {
        console.error("Error calculating text color for:", hexColor, e);
        return '#212529'; // Default dark on error
    }
}


/**
 * Generates an inline style string for the magnitude badge background and text color.
 */
function getMagnitudeBadgeStyle(magnitude) {
    const bgColor = getMagnitudeColor(magnitude); // Get hex color from map module
    const textColor = getTextColorForBackground(bgColor);
    return `background-color: ${bgColor}; color: ${textColor};`;
}


/** Renders the list of earthquakes onto the page. */
export function displayEarthquakesOnList(earthquakes) {
    dom.earthquakeListContainer.innerHTML = ""; // Clear previous cards first
    dom.noResultsList.classList.toggle("d-none", earthquakes.length > 0);
  
    if (earthquakes.length === 0) return; // Don't proceed if no results
  
    let cardsHtml = ""; // Build HTML string first
    earthquakes.forEach((quake) => {
      const depth = quake.depth.toFixed(1);
      const magnitude = quake.mag;
      const displayMag = magnitude !== null ? magnitude.toFixed(1) : "Yok";
      const absoluteTime = formatTime(quake.time);
      const relativeTime = formatRelativeTime(quake.time);
      const location = translateLocationString(quake.locationString, quake.source);
      const url = quake.url;
      const quakeId = quake.id;
      const badgeStyle = getMagnitudeBadgeStyle(magnitude);
      let detailLinkHtml = '';
      if (url) {
          detailLinkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">Daha Fazla Detay (${quake.source.toUpperCase()}) <span class="material-symbols-outlined align-middle" style="font-size: 1em;">open_in_new</span></a>`;
      } else {
          detailLinkHtml = `<small class="text-muted">Kaynak: ${quake.source.toUpperCase()}</small>`;
      }
  
      // Add a class for animation targeting
      cardsHtml += `
          <div class="col-md-6 col-lg-4 mb-4 d-flex align-items-stretch earthquake-list-item">
              <div class="card earthquake-card w-100 shadow-sm" data-quake-id="${quakeId}">
                  <div class="card-body d-flex flex-column">
                      <h5 class="card-title"><span class="material-symbols-outlined">place</span> ${location}</h5>
                      <p class="card-text mt-2"><span class="material-symbols-outlined">waves</span> Büyüklük: <span class="badge magnitude-badge" style="${badgeStyle}">${displayMag}</span></p>
                      <p class="card-text"><span class="material-symbols-outlined">vertical_align_bottom</span> Derinlik: ${depth} km</p>
                      <p class="card-text"><span class="material-symbols-outlined">schedule</span> Zaman: ${absoluteTime} <small class="text-muted">(${relativeTime})</small></p>
                      <div class="mt-auto pt-2">${detailLinkHtml}</div>
                  </div>
              </div>
          </div>`;
    });
  
    // Set the HTML content
    dom.earthquakeListContainer.innerHTML = cardsHtml;
  
    // --- Add Card Animation ---
    if (typeof anime !== 'undefined') {
        anime({
            targets: '.earthquake-list-item', // Target the wrapper div
            opacity: [0, 1], // Fade in
            translateY: [20, 0], // Slight upward movement
            scale: [0.95, 1], // Slight scale up
            delay: anime.stagger(30), // Stagger animation by 30ms per card
            duration: 400,
            easing: 'easeOutQuad'
        });
    }
    // --- End Card Animation ---
  }

/** Displays earthquakes on the Leaflet map. */
export function displayEarthquakesOnMap(earthquakes) {
  if (!state.mapInitialized || !state.earthquakeLayer) return;
  state.earthquakeLayer.clearLayers();
  dom.noResultsMap.classList.toggle("d-none", earthquakes.length === 0);

  earthquakes.forEach((quake) => {
    const lat = quake.lat;
    const lon = quake.lon;
    const depth = quake.depth.toFixed(1);
    const magnitude = quake.mag !== null ? quake.mag : -1;
    const displayMag = magnitude >= 0 ? magnitude.toFixed(1) : "Yok";
    const absoluteTime = formatTime(quake.time); // Get absolute time
    const relativeTime = formatRelativeTime(quake.time); // Get relative time
    const location = translateLocationString(quake.locationString, quake.source);
    const url = quake.url;

    if (magnitude < 0 || lat == null || lon == null) return;

    const badgeStyle = getMagnitudeBadgeStyle(magnitude);

    const marker = L.circleMarker([lat, lon], {
      radius: getMagnitudeRadius(magnitude),
      fillColor: getMagnitudeColor(magnitude),
      color: "#000000", // Black border for light map
      weight: 0.5, opacity: 1, fillOpacity: 0.7,
    });

    // Update popup content
    let popupContent = `<b>${location}</b><p>Büyüklük: <span class="badge" style="${badgeStyle}">${displayMag}</span></p><p>Derinlik: ${depth} km</p><p>Zaman: ${absoluteTime} <small class="text-muted">(${relativeTime})</small></p>`; // Combined time display
    if (url) {
        popupContent += `<a href="${url}" target="_blank" rel="noopener noreferrer">Daha Fazla Detay (${quake.source.toUpperCase()})</a>`;
    } else {
        popupContent += `<small class="text-muted">Kaynak: ${quake.source.toUpperCase()}</small>`;
    }

    marker.bindPopup(popupContent);
    state.earthquakeLayer.addLayer(marker);
  });
}

/** Shows or hides the loading indicator. */
export function showLoading(isLoading) {
  dom.loadingIndicator.style.display = isLoading ? "none" : "none";
}

/** Shows an error message or hides the error container. */
export function showError(message) {
    const hasMessage = !!message;
    dom.errorContainer.textContent = message || "";

    if (typeof anime !== 'undefined') {
        anime({
            targets: dom.errorContainer,
            opacity: hasMessage ? 1 : 0,
            duration: 250,
            easing: 'easeOutQuad',
             begin: () => {
                if (hasMessage) dom.errorContainer.classList.remove('d-none');
            },
            complete: () => {
                if (!hasMessage) dom.errorContainer.classList.add('d-none');
            }
        });
    } else {
        // Fallback for no AnimeJS
        dom.errorContainer.classList.toggle("d-none", !hasMessage);
    }
}

/** Updates the UI elements indicating the current data source */
export function updateDataSourceUI() {
    const sourceName = state.currentSource === 'kandilli' ? 'Kandilli' : 'USGS';
    dom.dataSourceIndicator.textContent = `Kaynak: ${sourceName}`;
    if (state.currentSource === 'kandilli') {
        dom.sourceKandilliRadio.checked = true;
        dom.kandilliLink.style.fontWeight = 'bold';
        dom.usgsLink.style.fontWeight = 'normal';
    } else {
        dom.sourceUsgsRadio.checked = true;
        dom.usgsLink.style.fontWeight = 'bold';
        dom.kandilliLink.style.fontWeight = 'normal';
    }
}
