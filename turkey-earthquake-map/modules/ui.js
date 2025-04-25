import * as dom from './dom.js';
import { state } from './state.js';
import { countryMap, directionMap } from './config.js';
import { getMagnitudeColor, getMagnitudeRadius } from './map.js';

export function formatTime(timestamp) {
  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    console.warn("Invalid timestamp received:", timestamp);
    return "Geçersiz Zaman";
  }
  return new Date(timestamp).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

/** Converts a string to Turkish Title Case. */
function toTurkishTitleCase(str) {
    if (!str) return "";
    return str
        .toLocaleLowerCase('tr-TR')
        .split(' ')
        .map(word => {
            if (!word) return "";
            const firstChar = word.charAt(0);
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
            const rawMain = match[1] ? match[1].trim() : ''; const rawHyphen = match[2] ? match[2].trim() : null; const rawParen = match[3] ? match[3].trim() : null;
            const titleMain = toTurkishTitleCase(rawMain); const titleHyphen = rawHyphen ? toTurkishTitleCase(rawHyphen) : null; const titleParen = rawParen ? toTurkishTitleCase(rawParen) : null;
            if (titleHyphen && titleParen) { return `${titleMain}, ${titleHyphen} (${titleParen})`; }
            else if (titleParen) { if (locationString.includes(`-(${rawParen})`)) { return `${titleMain}, ${titleParen}`; } else { return `${titleMain} (${titleParen})`; } }
            else if (titleHyphen) { return `${titleMain}, ${titleHyphen}`; }
            else { return titleMain; }
        } else { return toTurkishTitleCase(locationString); }
    }
    return locationString;
}

/**
 * Calculates perceived brightness and returns appropriate text color (light/dark).
 * @param {string} hexColor - Background color in hex format (e.g., "#RRGGBB").
 * @returns {string} - Text color hex code ('#FFFFFF' or '#212529').
 */
function getTextColorForBackground(hexColor) {
    if (!hexColor || hexColor.length < 7) return '#212529'; // Default dark for invalid input

    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Calculate luminance (YIQ formula)
        const luminance = (r * 299 + g * 587 + b * 114) / 1000;

        return luminance >= 140 ? '#212529' : '#FFFFFF'; // Dark text on light bg, light text on dark bg
    } catch (e) {
        console.error("Error calculating text color for:", hexColor, e);
        return '#212529'; // Default dark on error
    }
}


/**
 * Generates an inline style string for the magnitude badge background and text color.
 * @param {number | null} magnitude - The earthquake magnitude.
 * @returns {string} - The inline style string (e.g., "background-color: #FFEE58; color: #212529;").
 */
function getMagnitudeBadgeStyle(magnitude) {
    const bgColor = getMagnitudeColor(magnitude); // Get hex color from map module
    const textColor = getTextColorForBackground(bgColor);
    return `background-color: ${bgColor}; color: ${textColor};`;
}


export function displayEarthquakesOnList(earthquakes) {
  dom.earthquakeListContainer.innerHTML = "";
  dom.noResultsList.classList.toggle("d-none", earthquakes.length > 0);

  earthquakes.forEach((quake) => {
    const depth = quake.depth.toFixed(1);
    const magnitude = quake.mag;
    const displayMag = magnitude !== null ? magnitude.toFixed(1) : "Yok";
    const time = formatTime(quake.time);
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

    const card = `
        <div class="col-md-6 col-lg-4 mb-4 d-flex align-items-stretch">
            <div class="card earthquake-card w-100 shadow-sm" data-quake-id="${quakeId}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title"><span class="material-symbols-outlined">place</span> ${location}</h5>
                    <p class="card-text mt-2"><span class="material-symbols-outlined">waves</span> Büyüklük: <span class="badge magnitude-badge" style="${badgeStyle}">${displayMag}</span></p> <!-- Apply inline style -->
                    <p class="card-text"><span class="material-symbols-outlined">vertical_align_bottom</span> Derinlik: ${depth} km</p>
                    <p class="card-text"><span class="material-symbols-outlined">schedule</span> Zaman: ${time} <small class="text-muted">(yerel saatiniz)</small></p>
                    <div class="mt-auto pt-2">${detailLinkHtml}</div>
                </div>
            </div>
        </div>`;
    dom.earthquakeListContainer.innerHTML += card;
  });
}

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
      const time = formatTime(quake.time);
      const location = translateLocationString(quake.locationString, quake.source);
      const url = quake.url;
  
      if (magnitude < 0 || lat == null || lon == null) return;
  
      const badgeStyle = getMagnitudeBadgeStyle(magnitude); // For popup
  
      const marker = L.circleMarker([lat, lon], {
        radius: getMagnitudeRadius(magnitude),
        fillColor: getMagnitudeColor(magnitude),
        color: "#000000",
        weight: 0.5,
        opacity: 1,
        fillOpacity: 0.7,
      });
  
      let popupContent = `<b>${location}</b><p>Büyüklük: <span class="badge" style="${badgeStyle}">${displayMag}</span></p><p>Derinlik: ${depth} km</p><p>Zaman: ${time} <small class="text-muted">(yerel saatiniz)</small></p>`;
      if (url) {
          popupContent += `<a href="${url}" target="_blank" rel="noopener noreferrer">Daha Fazla Detay (${quake.source.toUpperCase()})</a>`;
      } else {
          popupContent += `<small class="text-muted">Kaynak: ${quake.source.toUpperCase()}</small>`;
      }
  
      marker.bindPopup(popupContent);
  
      state.earthquakeLayer.addLayer(marker);
    });
  }

export function showLoading(isLoading) {
  dom.loadingIndicator.style.display = isLoading ? "block" : "none";
}

export function showError(message) {
  dom.errorContainer.textContent = message || "";
  dom.errorContainer.classList.toggle("d-none", !message);
}

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
