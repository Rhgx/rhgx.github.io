// generate-list/scripts.js

let currentWhitelistData = null;
let selectedModeKey = 'status6v6';

const contentArea = document.getElementById("whitelist-content");
const pageTitle = document.getElementById("page-title");
const modeSelectLinks = document.querySelectorAll(".mode-select");
const generateButton = document.getElementById("generate-button");
const bsNavbar = document.getElementById('navbarNav');
const allowAllButton = document.getElementById("allow-all-button");
const banAllButton = document.getElementById("ban-all-button");

// --- Constants ---
const CLASS_ORDER = [
  "Flanker", "Trooper", "Arsonist", "Annihilator",
  "Brute", "Mechanic", "Doctor", "Marksman", "Agent"
];
const SLOT_ORDER = ["Primary", "Secondary", "Watches", "Cloak", "Melee", "PDA", "Sapper"];
const ALL_CLASS_SLOT_ORDER = ["Melee"];
const OFFCLASSES = ['Arsonist', 'Annihilator', 'Brute', 'Mechanic', 'Marksman', 'Agent'];

const MODE_MAP = {
  "status6v6": { title: "6v6", showOffclassIndicator: true },
  "statusHL": { title: "Highlander", showOffclassIndicator: false },
  "statusPro": { title: "Prolander", showOffclassIndicator: true },
  "status4v5": { title: "4v4/5v5", showOffclassIndicator: false }
};

const BANNED_CLASSES_MAP = {
    "status4v5": [],
    "status6v6": [],
    "statusHL": [],
    "statusPro": []
};
// --- End Constants ---


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  loadDefaultData();

  modeSelectLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        selectedModeKey = link.getAttribute('data-mode');
        updateActiveModeLink();
        renderWhitelist(); // Full re-render needed on mode change
        if (bsNavbar && bsNavbar.classList.contains('show')) {
            const toggler = document.querySelector('.navbar-toggler');
            if (toggler) toggler.click();
        }
    });
  });

  if(generateButton) generateButton.addEventListener('click', generateAndDownloadJson);
  if(allowAllButton) allowAllButton.addEventListener('click', () => setAllVisibleStatus('Allowed'));
  if(banAllButton) banAllButton.addEventListener('click', () => setAllVisibleStatus('Banned'));
});

// --- Data Loading ---
async function loadDefaultData() {
  if (!contentArea) return;
  contentArea.innerHTML = createMessageColumn('loading-container', 'loading-message', '<div class="spinner"></div><p class="mt-3">Loading default weapons...</p>');

  try {
    const response = await fetch("default-weapons.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    currentWhitelistData = await response.json();
    updateActiveModeLink();
    renderWhitelist(); // Initial render triggers animations
  } catch (error) {
    console.error("Error loading default data:", error);
    contentArea.innerHTML = createMessageColumn('error-message-container', 'error-message', 'Failed to load default weapon data.');
    if(generateButton) generateButton.disabled = true;
    if(allowAllButton) allowAllButton.disabled = true;
    if(banAllButton) banAllButton.disabled = true;
  }
}

// --- UI Update Functions ---
function updateActiveModeLink() {
    pageTitle.textContent = `Edit ${MODE_MAP[selectedModeKey]?.title || 'Unknown'} Whitelist`;
    modeSelectLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-mode') === selectedModeKey);
    });
}

// --- Content Rendering ---
function renderWhitelist() {
  if (!contentArea || !currentWhitelistData) return;

  contentArea.innerHTML = ''; // Clear previous content
  const fragment = document.createDocumentFragment();
  const bannedClassesForMode = BANNED_CLASSES_MAP[selectedModeKey] || [];

  // --- 1. Render Specific Class Cards ---
  CLASS_ORDER.forEach((className) => {
    if (!currentWhitelistData[className]) return;

    const isClassBanned = bannedClassesForMode.includes(className);
    const isOffclass = OFFCLASSES.includes(className);
    const classData = currentWhitelistData[className];
    let hasContentForClass = false;

    const colDiv = document.createElement('div');
    colDiv.className = 'col-12 col-md-6 col-lg-4 mb-4 class-column';
    if (isClassBanned) colDiv.classList.add('class-banned');

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card whitelist-card'; // Animation class applied here

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header class-header';
    cardHeader.appendChild(document.createTextNode(className));

    const showIndicator = (selectedModeKey === 'status6v6' || selectedModeKey === 'statusPro');
    if (isOffclass && !isClassBanned && showIndicator) {
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

        slotData.forEach((item, itemIndex) => {
          const listItem = document.createElement("li");
          listItem.className = "weapon-item";

          if (item.icon) {
            const imgIcon = document.createElement("img");
            const classFolderName = className.toLowerCase().replace(/\s+/g, '_');
            imgIcon.src = `../icons/${classFolderName}/${item.icon}`;
            imgIcon.alt = item.weapon;
            imgIcon.className = "weapon-icon";
            imgIcon.loading = "lazy";
            imgIcon.onerror = function() { this.style.display = 'none'; console.warn(`Icon not found: ${this.src}`); };
            listItem.appendChild(imgIcon);
          }

          const weaponNameSpan = document.createElement("span");
          weaponNameSpan.className = "weapon-name";
          weaponNameSpan.textContent = item.weapon;
          listItem.appendChild(weaponNameSpan);

          const weaponStatusSpan = document.createElement("span");
          const status = item[selectedModeKey] || "N/A";
          weaponStatusSpan.textContent = status;
          weaponStatusSpan.className = getStatusClass(status);
          listItem.appendChild(weaponStatusSpan); // Append status span

          // Add click listener for toggling (only if not 'Always' and class not banned)
          if (status.toLowerCase() !== 'always' && !isClassBanned) {
            // *** MODIFIED: Pass the status span itself to the handler ***
            listItem.addEventListener('click', () => {
              toggleWeaponStatus(className, slotName, itemIndex, selectedModeKey, weaponStatusSpan);
            });
          } else {
             listItem.style.cursor = 'not-allowed';
          }

          weaponList.appendChild(listItem);
        }); // End weapon loop
        cardBody.appendChild(weaponList);
      } // End slot content check
    }); // End slot loop

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
    } else if (isClassBanned) { // Show banned placeholder
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
  }); // --- End CLASS_ORDER loop ---


  // --- 2. Render All-Class Section ---
  const allClassData = currentWhitelistData['All-Class'];
  if (allClassData) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-12 mb-4 all-class-column';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card whitelist-card'; // Animation class applied here

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header class-header';
    cardHeader.textContent = 'All-Class';
    cardDiv.appendChild(cardHeader);

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    (ALL_CLASS_SLOT_ORDER || Object.keys(allClassData)).forEach((slotName) => {
        if (allClassData[slotName] && allClassData[slotName].length > 0) {
            const slotData = allClassData[slotName];
            const slotHeading = document.createElement("h5");
            slotHeading.className = "slot-heading";
            slotHeading.textContent = slotName;
            cardBody.appendChild(slotHeading);
            const weaponList = document.createElement("ul");
            weaponList.className = "weapon-list list-unstyled";

            slotData.forEach((item, itemIndex) => {
                const listItem = document.createElement("li");
                listItem.className = "weapon-item";

                if (item.icon) {
                    const imgIcon = document.createElement("img");
                    imgIcon.src = `../icons/all-class/${item.icon}`;
                    imgIcon.alt = item.weapon;
                    imgIcon.className = "weapon-icon";
                    imgIcon.loading = "lazy";
                    imgIcon.onerror = function() { this.style.display = 'none'; console.warn(`Icon not found: ${this.src}`); };
                    listItem.appendChild(imgIcon);
                }

                const weaponNameSpan = document.createElement("span");
                weaponNameSpan.className = "weapon-name";
                weaponNameSpan.textContent = item.weapon;
                listItem.appendChild(weaponNameSpan);

                const weaponStatusSpan = document.createElement("span");
                const status = item[selectedModeKey] || "N/A";
                weaponStatusSpan.textContent = status;
                weaponStatusSpan.className = getStatusClass(status);
                listItem.appendChild(weaponStatusSpan); // Append status span

                // Add click listener for toggling (only if not 'Always')
                if (status.toLowerCase() !== 'always') {
                    // *** MODIFIED: Pass the status span itself to the handler ***
                    listItem.addEventListener('click', () => {
                       toggleWeaponStatus('All-Class', slotName, itemIndex, selectedModeKey, weaponStatusSpan);
                    });
                } else {
                    listItem.style.cursor = 'not-allowed';
                }

                weaponList.appendChild(listItem);
            }); // End weapon loop
            cardBody.appendChild(weaponList);
        } // End slot content check
    }); // End All-Class slot loop

    cardDiv.appendChild(cardBody);
    colDiv.appendChild(cardDiv);
    fragment.appendChild(colDiv);
  } // --- End All-Class Section ---

  contentArea.appendChild(fragment); // Append all generated content
}


// --- Interaction Logic ---
// *** MODIFIED: Accept statusSpan element, update DOM directly ***
function toggleWeaponStatus(className, slotName, itemIndex, modeKey, statusSpanElement) {
    if (!currentWhitelistData?.[className]?.[slotName]?.[itemIndex]) {
        console.error("Data structure error during toggle");
        return;
    }
    const item = currentWhitelistData[className][slotName][itemIndex];
    if (!item || !item[modeKey] || item[modeKey].toLowerCase() === 'always') {
        return; // Don't toggle 'Always' or missing status
    }

    // 1. Toggle data in the object
    item[modeKey] = (item[modeKey].toLowerCase() === 'allowed') ? 'Banned' : 'Allowed';

    // 2. Update the specific DOM element directly
    const newStatusText = item[modeKey];
    const newStatusClass = getStatusClass(newStatusText);

    statusSpanElement.textContent = newStatusText;
    statusSpanElement.className = newStatusClass; // Update class for color change

    // *** REMOVED: renderWhitelist(); ***
}

// *** Allow/Ban All still needs full re-render ***
function setAllVisibleStatus(newStatus) {
    if (!currentWhitelistData || (newStatus !== 'Allowed' && newStatus !== 'Banned')) {
        return;
    }
    const bannedClassesForCurrentMode = BANNED_CLASSES_MAP[selectedModeKey] || [];

    [...CLASS_ORDER, 'All-Class'].forEach(className => {
        if (!currentWhitelistData[className] || bannedClassesForCurrentMode.includes(className)) {
            return;
        }
        const classData = currentWhitelistData[className];
        Object.keys(classData).forEach(slotName => {
            if (classData[slotName] && Array.isArray(classData[slotName])) {
                classData[slotName].forEach(item => {
                    if (item && item[selectedModeKey] && item[selectedModeKey].toLowerCase() !== 'always') {
                        item[selectedModeKey] = newStatus;
                    }
                });
            }
        });
    });

    renderWhitelist(); // Re-render needed here to update all changed items
}


// --- JSON Generation and Download (generateAndDownloadJson - no changes needed) ---
function generateAndDownloadJson() {
    if (!currentWhitelistData) {
        alert("No whitelist data loaded or modified.");
        return;
    }
    try {
        const jsonString = JSON.stringify(currentWhitelistData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whitelist.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error generating JSON:", error);
        alert("An error occurred while generating the JSON file. Check the console.");
    }
}


// --- Helper Functions (getStatusClass, createMessageColumn - no changes needed) ---
function getStatusClass(statusText) {
  if (!statusText) return "weapon-status";
  const lowerStatus = statusText.toLowerCase();
  if (lowerStatus === "allowed") return "weapon-status status-allowed";
  if (lowerStatus === "banned") return "weapon-status status-banned";
  if (lowerStatus === "always") return "weapon-status status-always";
  return "weapon-status";
}

function createMessageColumn(containerClass, messageClass, htmlContent) {
    return `
        <div class="col-12 ${containerClass}">
             <div class="${messageClass}">${htmlContent}</div>
        </div>`;
}
// --- End Helper Functions ---
