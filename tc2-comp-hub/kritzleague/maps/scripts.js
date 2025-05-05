// /kritzleague/maps/scripts.js
let mapData = null;
const mapContentArea = document.getElementById("maps-content");
const mapPageTitle = document.getElementById("map-page-title");
const modeNavLinks = document.querySelectorAll(".mode-link");
const modeNavbarCollapse = document.getElementById("modeNav");

// --- Constants for Map Modes ---
const MAP_MODE_MAP = {
  "6v6": { key: "status6v6", title: "6v6 Map Pool" },
  "highlander": { key: "statusHL", title: "Highlander Map Pool" },
  "prolander": { key: "statusPro", title: "Prolander Map Pool" },
  "4v4_5v5": { key: "status4v5", title: "4v4/5v5 Map Pool" },
};

// NEW: Mapping for display names
const GAMEMODE_DISPLAY_NAMES = {
    koth: "King of the Hill",
    ad: "Attack / Defend",
    pl: "Payload",
    cp: "Control Points",
    ctf: "Capture The Flag",
    other: "Other" // Fallback
};

// UPDATED: Order using abbreviations
const GAMEMODE_ORDER = ["koth", "ad", "pl", "cp", "ctf", "other"];

// --- End Constants ---

// --- Helper Functions ---
function createMessageColumn(containerClass, messageClass, htmlContent) {
  return `
        <div class="col-12 ${containerClass}">
             <div class="${messageClass}">${htmlContent}</div>
        </div>`;
}

function getStatusClass(statusText) {
  if (!statusText) return "weapon-status"; // Use weapon-status as base class name
  const lowerStatus = statusText.toLowerCase().replace(/\s+/g, '-'); // Normalize

  // Map Statuses
  if (lowerStatus === "in-rotation") return "weapon-status status-in-rotation";
  if (lowerStatus === "out-of-rotation") return "weapon-status status-out-of-rotation";
  if (lowerStatus === "undecided") return "weapon-status status-undecided";
  if (lowerStatus === "anchor") return "weapon-status status-anchor";
  if (lowerStatus === "vaulted") return "weapon-status status-vaulted";
  if (lowerStatus === "experimenting") return "weapon-status status-testing"; // Added mapping

  // Fallback/Weapon Statuses (Keep for potential reuse/consistency)
  if (lowerStatus === "allowed") return "weapon-status status-allowed";
  if (lowerStatus === "banned") return "weapon-status status-banned";
  if (lowerStatus === "always") return "weapon-status status-always";
  if (lowerStatus === "testing") return "weapon-status status-testing";
  if (lowerStatus === "under-review" || lowerStatus === "review") return "weapon-status status-under-review";
  if (lowerStatus === "not-used") return "weapon-status status-not-used";


  return "weapon-status"; // Default
}
// --- End Helper Functions ---


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded. Initializing animations and data loading."); // Debug log

  // **** START: Animate Map Legend ****
  anime({
      targets: '#map-legend',
      opacity: [0, 1],        // Fade in
      translateY: [15, 0],    // Slide up (match initial CSS transform)
      duration: 600,          // Animation duration in ms
      delay: 200,             // Wait a bit before starting (optional)
      easing: 'easeOutQuad',  // Smooth easing
      begin: () => {
          // Optional: Re-enable pointer events when animation starts if disabled initially
          // const legend = document.getElementById('map-legend');
          // if (legend) legend.style.pointerEvents = 'auto';
          console.log("Map legend animation starting."); // Debug log
      },
      complete: () => {
          console.log("Map legend animation complete."); // Debug log
      }
  });
  // **** END: Animate Map Legend ****


  // --- Existing Initialization Code ---
  loadMapData();
  window.addEventListener("hashchange", handleMapRouteChange); // Listen for hash changes

  // Listener for Map Mode Sub-Nav clicks
  modeNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
      // Collapse sub-navbar on mobile after click
      if (modeNavbarCollapse && modeNavbarCollapse.classList.contains("show")) {
        const toggler = document.querySelector('.navbar-toggler[data-bs-target="#modeNav"]');
        if (toggler) {
            const collapseInstance = bootstrap.Collapse.getInstance(modeNavbarCollapse);
            if (collapseInstance) collapseInstance.hide();
            else toggler.click(); // Fallback
        }
      }
      // Note: handleMapRouteChange will be triggered by the hash change
    });
  });

   // Listener for main navbar collapse (optional, good UX)
   const mainNavbarCollapse = document.getElementById('mainNavContent');
   const mainToggler = document.querySelector('.navbar-toggler[data-bs-target="#mainNavContent"]');
   if (mainNavbarCollapse && mainToggler) {
       const mainNavLinks = document.querySelectorAll('.main-nav-link');
       mainNavLinks.forEach(link => {
           link.addEventListener('click', () => {
               if (mainNavbarCollapse.classList.contains('show')) {
                   const collapseInstance = bootstrap.Collapse.getInstance(mainNavbarCollapse);
                   if (collapseInstance) collapseInstance.hide();
                   else mainToggler.click();
               }
           });
       });
   }
   // --- End Existing Initialization Code ---
});
// --- End Event Listeners ---


// --- Data Loading ---
async function loadMapData() {
   if (mapContentArea) {
       mapContentArea.innerHTML = createMessageColumn(
           "loading-container", "loading-message",
           '<div class="spinner"></div><p class="mt-3">Loading map data...</p>'
       );
   }

  try {
    // Fetch ONLY map data
    const response = await fetch("https://raw.githubusercontent.com/Kritzleague/banjson/refs/heads/main/maps-whitelist.json");

    if (response.ok) {
        mapData = await response.json();
        handleMapRouteChange(); // Call routing function to display based on hash
    } else {
        console.error(`HTTP error loading maps! status: ${response.status}`);
        mapData = null;
         if (mapContentArea) {
             mapContentArea.innerHTML = createMessageColumn(
                "error-message-container", "error-message", "Failed to load map data."
            );
         }
         if (mapPageTitle) mapPageTitle.textContent = "Error Loading Maps"; // Update title on error
    }
  } catch (error) {
    console.error("Error loading map data:", error);
    mapData = null;
    if (mapContentArea) {
         mapContentArea.innerHTML = createMessageColumn(
            "error-message-container", "error-message", "Failed to load map data."
        );
    }
    if (mapPageTitle) mapPageTitle.textContent = "Error Loading Maps"; // Update title on error
  }
}
// --- End Data Loading ---


// --- Routing and Display Logic ---

// Handles map mode changes via hash
function handleMapRouteChange() {
  if (!mapContentArea || !mapPageTitle) return;

  const hash = window.location.hash.substring(1); // e.g., "6v6", "highlander"
  const modeInfo = MAP_MODE_MAP[hash];
  const currentModeKey = modeInfo ? modeInfo.key : null; // e.g., "status6v6"

  // Update active state for game mode links (sub-nav)
  modeNavLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${hash}`);
  });

  // Update UI
  mapContentArea.classList.add("loading"); // Show loading state during update
  requestAnimationFrame(() => { // Use rAF for smoother transition
      mapContentArea.innerHTML = ""; // Clear previous map cards

      if (mapData && modeInfo) {
          mapPageTitle.textContent = modeInfo.title; // Update title
          displayMaps(currentModeKey); // Pass the key to display function
      } else if (!mapData && hash) {
          // Data not loaded, but tried to select a mode
          mapPageTitle.textContent = "Error";
          mapContentArea.innerHTML = createMessageColumn(
              "error-message-container", "error-message",
              `Could not load map data. Cannot display mode: ${hash}`
          );
      } else if (!mapData && !hash) {
           // Data not loaded, no mode selected
          mapPageTitle.textContent = "Error";
          mapContentArea.innerHTML = createMessageColumn(
              "error-message-container", "error-message",
              "Failed to load map data."
          );
      } else {
          // Data loaded, but no valid mode selected (default view)
          mapPageTitle.textContent = "Map Pool"; // Default title
          mapContentArea.innerHTML = createMessageColumn(
              "main-page-content-container", // Re-use style if appropriate
              "main-page-content",
              "<p>Select a game mode from the navigation above to view its specific map pool status.</p>"
          );
      }

      // Remove loading class after a short delay (Anime.js will handle fade-in)
      // We still clear the loading spinner etc. here
      setTimeout(() => mapContentArea.classList.remove("loading"), 50);
  });
}

// Accepts modeKey to display the correct status
function displayMaps(modeKey) {
    // Basic checks, main checks happen in handleMapRouteChange
    if (!mapContentArea || !mapData || !modeKey) {
         if (mapContentArea && !modeKey) {
             // This case is handled by handleMapRouteChange's default message
             console.warn("displayMaps called without a valid modeKey.");
         }
         return;
     }

    // mapContentArea is cleared in handleMapRouteChange

    if (mapData.length === 0) {
         mapContentArea.innerHTML = createMessageColumn(
             "info-message-container", "info-message", "No maps found in the data."
         );
        return;
    }

    const fragment = document.createDocumentFragment();
    // Grouping now uses the abbreviations directly from JSON
    const mapsByGamemode = mapData.reduce((acc, map) => {
        const modeAbbr = map.gamemode || "other"; // Use abbreviation
        if (!acc[modeAbbr]) acc[modeAbbr] = [];
        acc[modeAbbr].push(map);
        return acc;
    }, {});

    // Iterate using the abbreviation order
    GAMEMODE_ORDER.forEach(gamemodeAbbr => {
        if (mapsByGamemode[gamemodeAbbr]) {
            const modeHeadingCol = document.createElement('div');
            modeHeadingCol.className = 'col-12 gamemode-heading-col';
            const modeHeading = document.createElement('h3');
            modeHeading.className = 'gamemode-heading';
            // Use the mapping to get the full display name
            modeHeading.textContent = GAMEMODE_DISPLAY_NAMES[gamemodeAbbr] || gamemodeAbbr; // Fallback to abbr if not found
            modeHeadingCol.appendChild(modeHeading);
            fragment.appendChild(modeHeadingCol);

            mapsByGamemode[gamemodeAbbr].forEach(map => {
                const colDiv = document.createElement("div");
                colDiv.className = "col-12 col-sm-6 col-md-4 col-lg-3 mb-4 map-column";
                const cardDiv = document.createElement("div");
                // Add map-card class for Anime.js targeting
                cardDiv.className = "card map-card h-100";
                if (map.image) {
                    const img = document.createElement("img");
                    const mapGamemodeAbbr = map.gamemode || 'other'; // Get the gamemode for the path

                    // Construct image path using gamemode abbreviation
                    img.src = `../../images/maps/${mapGamemodeAbbr}/${map.image}`;

                    img.alt = map.name;
                    img.className = "card-img-top map-image";
                    img.loading = "lazy";
                    img.onerror = function() {
                        this.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'map-image-placeholder d-flex align-items-center justify-content-center';
                        placeholder.textContent = 'No Image';
                        if (cardDiv.querySelector('.card-body')) cardDiv.insertBefore(placeholder, cardDiv.querySelector('.card-body'));
                        else cardDiv.appendChild(placeholder);
                        console.warn(`Map image not found: ${this.src}`);
                    };
                    cardDiv.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'map-image-placeholder d-flex align-items-center justify-content-center';
                    placeholder.textContent = 'No Image';
                    cardDiv.appendChild(placeholder);
                }
                const cardBody = document.createElement("div");
                cardBody.className = "card-body d-flex flex-column";
                const mapName = document.createElement("h5");
                mapName.className = "card-title map-name";
                mapName.textContent = map.name;
                cardBody.appendChild(mapName);
                const mapStatus = document.createElement("p");
                mapStatus.className = "card-text map-status mb-2 mt-auto";
                const statusSpan = document.createElement("span");

                // Use the modeKey to get the correct status
                const currentStatus = map[modeKey] || "N/A";
                statusSpan.textContent = currentStatus;
                statusSpan.className = getStatusClass(currentStatus); // Style based on this status

                mapStatus.appendChild(document.createTextNode("Status: "));
                mapStatus.appendChild(statusSpan);
                cardBody.appendChild(mapStatus);

                // Show general reason tooltip if it exists
                if (map.reason && map.reason.trim() !== "") {
                    const reasonIndicator = document.createElement("span");
                    reasonIndicator.className = "ban-reason-indicator ms-2";
                    reasonIndicator.textContent = "?";
                    reasonIndicator.setAttribute("data-tippy-content", map.reason);
                    // Append after statusSpan
                    if (statusSpan.parentNode) {
                        statusSpan.parentNode.appendChild(reasonIndicator);
                    } else {
                        mapStatus.appendChild(reasonIndicator); // Fallback
                    }
                }
                cardDiv.appendChild(cardBody);
                colDiv.appendChild(cardDiv);
                fragment.appendChild(colDiv);
            });
        }
    });

    // Append all generated cards at once
    mapContentArea.appendChild(fragment);

    // Initialize Tippy tooltips for reasons
     tippy('#maps-content [data-tippy-content]', {
         allowHTML: true, placement: 'top', animation: 'fade', theme: 'custom-dark'
     });

    // ADD Anime.js Animation Call for Map Cards
    anime({
        targets: '#maps-content .map-card', // Target the cards just added
        opacity: [0, 1],        // Fade in
        translateY: [10, 0],    // Slide up slightly
        duration: 250,          // Faster duration (adjust as needed)
        delay: anime.stagger(20), // Stagger the start of each animation by 50ms
        easing: 'easeOutQuad'   // Smooth easing
    });
}
// --- End Display Logic ---
