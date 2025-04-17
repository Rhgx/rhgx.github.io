let whitelistData = null;
const contentArea = document.getElementById("whitelist-content");
const pageTitle = document.getElementById("page-title");
const navLinks = document.querySelectorAll(".nav-link");
const bsNavbar = document.getElementById('navbarNav');

const CLASS_ORDER = [
  "Flanker", "Trooper", "Arsonist", "Annihilator",
  "Brute", "Mechanic", "Doctor", "Marksman", "Agent"
];
const SLOT_ORDER = ["Primary", "Secondary", "Watches", "Cloak", "Melee", "PDA", "Sapper"];

// Define typical offclasses
const OFFCLASSES = ['Arsonist', 'Annihilator', 'Brute', 'Mechanic', 'Marksman', 'Agent'];

// Map URL hash fragments to JSON keys and display titles
const MODE_MAP = {
  "6v6": { key: "status6v6", title: "6v6 Whitelist", showOffclassIndicator: true },
  "highlander": { key: "statusHL", title: "Highlander Whitelist", showOffclassIndicator: false },
  "prolander": { key: "statusPro", title: "Prolander Whitelist", showOffclassIndicator: false },
  "4v4_5v5": { key: "status4v5", title: "4v4/5v5 Whitelist", showOffclassIndicator: true } 
};

// DEFINE BANNED CLASSES PER MODE
const BANNED_CLASSES_MAP = {
    "status4v5": [],
    "status6v6": [],
    "statusHL": [],
    "statusPro": []
};

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("hashchange", handleRouteChange);
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (bsNavbar && bsNavbar.classList.contains('show')) {
            const toggler = document.querySelector('.navbar-toggler');
            if (toggler) toggler.click();
        }
    });
  });
  loadWhitelistData();
});

// --- Data Loading ---
async function loadWhitelistData() {
  if (!contentArea) return;
  // Initial loading state handled by static HTML

  try {
    const response = await fetch("whitelist.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    whitelistData = await response.json();
    handleRouteChange();
  } catch (error) {
    console.error("Error loading whitelist data:", error);
    whitelistData = null;
    handleRouteChange();
  }
}

// --- Routing and Page Update Logic ---
function handleRouteChange() {
    const hash = window.location.hash.substring(1);
    const modeInfo = MODE_MAP[hash];
    const currentModeKey = modeInfo ? modeInfo.key : null;
    // *** Get the flag for showing the indicator ***
    const shouldShowOffclassIndicator = modeInfo ? modeInfo.showOffclassIndicator : false;

    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${hash}`);
    });

    contentArea.classList.add('loading');

    requestAnimationFrame(() => {
        contentArea.innerHTML = ''; // Clear previous content

        if (whitelistData && modeInfo) {
            pageTitle.textContent = modeInfo.title;
            // *** Pass the indicator flag to displayMode ***
            displayMode(currentModeKey, shouldShowOffclassIndicator);
        } else if (!whitelistData && hash) {
            pageTitle.textContent = "Error";
            contentArea.innerHTML = createMessageColumn('error-message-container', 'error-message', `Could not load whitelist data. Cannot display mode: ${hash}`);
        } else if (!whitelistData && !hash) {
             pageTitle.textContent = "Error";
             contentArea.innerHTML = createMessageColumn('error-message-container', 'error-message', 'Failed to load whitelist data.');
        } else if (!modeInfo) {
            pageTitle.textContent = "Welcome";
            contentArea.innerHTML = createMessageColumn('main-page-content-container', 'main-page-content', '<p>Select a game mode from the navigation above to view its specific weapon whitelist.</p>');
        }
        setTimeout(() => contentArea.classList.remove('loading'), 50);
    });
}

// --- Helper Functions --- (createMessageColumn, getStatusClass remain the same)
function createMessageColumn(containerClass, messageClass, htmlContent) {
    return `
        <div class="col-12 ${containerClass}">
             <div class="${messageClass}">${htmlContent}</div>
        </div>`;
}

function getStatusClass(statusText) {
  if (!statusText) return "weapon-status";
  const lowerStatus = statusText.toLowerCase();
  if (lowerStatus === "allowed") return "weapon-status status-allowed";
  if (lowerStatus === "banned") return "weapon-status status-banned";
  if (lowerStatus === "always") return "weapon-status status-always";
  return "weapon-status";
}
// --- End Helper Functions ---


// --- Content Rendering ---
// *** MODIFIED: Accept shouldShowOffclassIndicator flag ***
function displayMode(modeKey, shouldShowOffclassIndicator) {
  if (!contentArea || !whitelistData) return;

  const fragment = document.createDocumentFragment();
  const bannedClassesForMode = BANNED_CLASSES_MAP[modeKey] || [];

  CLASS_ORDER.forEach((className) => {
    if (!whitelistData[className]) return;

    const isClassBanned = bannedClassesForMode.includes(className);
    // *** Check offclass status regardless of mode ***
    const isOffclass = OFFCLASSES.includes(className);
    const classData = whitelistData[className];
    let hasContentForClass = false;

    const colDiv = document.createElement('div');
    colDiv.className = 'col-12 col-md-6 col-lg-4 mb-4';
    if (isClassBanned) {
        colDiv.classList.add('class-banned');
    }

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card whitelist-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header class-header';
    cardHeader.appendChild(document.createTextNode(className));

    // *** MODIFIED: Check mode flag before adding indicator ***
    if (isOffclass && !isClassBanned && shouldShowOffclassIndicator) {
        const indicatorSpan = document.createElement('span');
        indicatorSpan.className = 'offclass-indicator';
        indicatorSpan.textContent = 'Offclass';
        cardHeader.appendChild(indicatorSpan);
    }
    cardDiv.appendChild(cardHeader);


    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    SLOT_ORDER.forEach((slotName) => {
      if (classData[slotName] && classData[slotName].length > 0) {
        hasContentForClass = true;
        const slotData = classData[slotName];

        const slotHeading = document.createElement("h5");
        slotHeading.className = "slot-heading";
        slotHeading.textContent = slotName;
        cardBody.appendChild(slotHeading);

        const weaponList = document.createElement("ul");
        weaponList.className = "weapon-list list-unstyled";

        slotData.forEach((item) => {
          const listItem = document.createElement("li");
          listItem.className = "weapon-item";

          if (item.icon) {
            const imgIcon = document.createElement("img");
            const classFolderName = className.toLowerCase().replace(/\s+/g, '_');
            imgIcon.src = `icons/${classFolderName}/${item.icon}`;
            imgIcon.alt = item.weapon;
            imgIcon.className = "weapon-icon";
            imgIcon.loading = "lazy";
            imgIcon.onerror = function() { this.style.display = 'none'; console.warn(`Icon not found: ${this.src}`); };
            listItem.appendChild(imgIcon);
          }

          const weaponNameSpan = document.createElement("span");
          weaponNameSpan.className = "weapon-name";
          weaponNameSpan.textContent = item.weapon;

          const weaponStatusSpan = document.createElement("span");
          const status = item[modeKey] || "N/A";
          weaponStatusSpan.textContent = status;
          weaponStatusSpan.className = getStatusClass(status);

          listItem.appendChild(weaponNameSpan);
          listItem.appendChild(weaponStatusSpan);
          weaponList.appendChild(listItem);
        });
        cardBody.appendChild(weaponList);
      }
    });

    if (isClassBanned) {
        const overlayDiv = document.createElement('div');
        overlayDiv.className = 'banned-overlay';
        overlayDiv.innerHTML = `<span class="banned-overlay-text">Banned</span>`;
        colDiv.appendChild(overlayDiv);
    }

    if (hasContentForClass) {
        cardDiv.appendChild(cardBody);
        colDiv.appendChild(cardDiv);
        fragment.appendChild(colDiv);
    } else if (isClassBanned) {
         colDiv.innerHTML = '';
         const overlayDiv = document.createElement('div');
         overlayDiv.className = 'banned-overlay';
         overlayDiv.innerHTML = `<span class="banned-overlay-text">Banned</span>`;
         colDiv.style.minHeight = '150px';
         colDiv.style.border = '1px dashed var(--border-color)';
         colDiv.style.borderRadius = 'var(--bs-card-border-radius)';
         colDiv.appendChild(overlayDiv);
         fragment.appendChild(colDiv);
    }
  });

  contentArea.appendChild(fragment);
}
