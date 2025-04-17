// scripts.js

let whitelistData = null;
const contentArea = document.getElementById("whitelist-content"); // This is now the <div class="row">
const pageTitle = document.getElementById("page-title");
const navLinks = document.querySelectorAll(".nav-link");
const bsNavbar = document.getElementById('navbarNav'); // Get navbar collapse element

const CLASS_ORDER = [
  "Flanker", "Trooper", "Arsonist", "Annihilator",
  "Brute", "Mechanic", "Doctor", "Marksman", "Agent"
];
const SLOT_ORDER = ["Primary", "Secondary", "Watches", "Melee", "PDA", "Sapper"];

const MODE_MAP = {
  "6v6": { key: "status6v6", title: "6v6 Whitelist" },
  "highlander": { key: "statusHL", title: "Highlander Whitelist" },
  "prolander": { key: "statusPro", title: "Prolander Whitelist" },
  "4v4_5v5": { key: "status4v5", title: "4v4/5v5 Whitelist" }
};

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("hashchange", handleRouteChange);
  // Add event listener to close mobile navbar on link click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (bsNavbar.classList.contains('show')) {
            const toggler = document.querySelector('.navbar-toggler');
            if (toggler) {
                toggler.click(); // Simulate click to close
            }
        }
    });
  });
  loadWhitelistData();
});

async function loadWhitelistData() {
  if (!contentArea) return;
  // Initial loading state is handled by static HTML

  try {
    const response = await fetch("whitelist.json");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    whitelistData = await response.json();
    handleRouteChange();
  } catch (error) {
    console.error("Error loading whitelist data:", error);
    whitelistData = null;
    handleRouteChange(); // Display error state
  }
}

function handleRouteChange() {
    const hash = window.location.hash.substring(1);
    const modeInfo = MODE_MAP[hash];

    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${hash}`);
    });

    contentArea.classList.add('loading'); // For potential fade effect

    // Use rAF for smoother clearing/updating
    requestAnimationFrame(() => {
        contentArea.innerHTML = ''; // Clear previous cards/messages

        if (whitelistData && modeInfo) {
            pageTitle.textContent = modeInfo.title;
            displayMode(modeInfo.key);
        } else if (!whitelistData && hash) {
            // Error occurred during load, show error message
            pageTitle.textContent = "Error";
            contentArea.innerHTML = createMessageColumn('error-message-container', 'error-message', `Could not load whitelist data. Cannot display mode: ${hash}`);
        } else if (!whitelistData && !hash) {
             // Error occurred before initial load finished
             pageTitle.textContent = "Error";
             contentArea.innerHTML = createMessageColumn('error-message-container', 'error-message', 'Failed to load whitelist data.');
        } else if (!modeInfo) {
            // No hash or invalid hash, show main page content
            pageTitle.textContent = "Welcome";
            contentArea.innerHTML = createMessageColumn('main-page-content-container', 'main-page-content', '<p>Select a game mode from the navigation above to view its specific weapon whitelist.</p>');
        }

        // Remove loading class slightly after potential content update
        setTimeout(() => contentArea.classList.remove('loading'), 50);
    });
}

// Helper to create full-width columns for messages
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

function displayMode(modeKey) {
  if (!contentArea || !whitelistData) return;
  // Content area is already cleared

  const fragment = document.createDocumentFragment();

  CLASS_ORDER.forEach((className) => {
    if (!whitelistData[className]) return;

    const classData = whitelistData[className];
    let hasContentForClass = false; // Flag to check if any slot has weapons

    // Create elements for the card structure
    const colDiv = document.createElement('div');
    // Define Bootstrap column classes for responsiveness
    colDiv.className = 'col-12 col-md-6 col-lg-4 mb-4'; // Full width on small, half on medium, third on large

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card whitelist-card'; // Apply animation class

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header class-header';
    cardHeader.textContent = className;
    cardDiv.appendChild(cardHeader);

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    SLOT_ORDER.forEach((slotName) => {
      if (classData[slotName] && classData[slotName].length > 0) {
        hasContentForClass = true; // Mark that this class has content
        const slotData = classData[slotName];

        const slotHeading = document.createElement("h5"); // Use h5 for card titles/headings
        slotHeading.className = "slot-heading";
        slotHeading.textContent = slotName;
        cardBody.appendChild(slotHeading);

        const weaponList = document.createElement("ul");
        weaponList.className = "weapon-list list-unstyled"; // Use Bootstrap class

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
        }); // End weapon loop
        cardBody.appendChild(weaponList);
      } // End check if slot has data
    }); // End SLOT_ORDER loop

    // Only add the card to the column if it has content
    if (hasContentForClass) {
        cardDiv.appendChild(cardBody);
        colDiv.appendChild(cardDiv);
        fragment.appendChild(colDiv); // Add the column wrapper to the fragment
    }
  }); // End CLASS_ORDER loop

  contentArea.appendChild(fragment); // Append all columns at once
}
