let whitelistData = null;
const weaponContentArea = document.getElementById("whitelist-content");
const weaponPageTitle = document.getElementById("page-title");
const modeNavLinks = document.querySelectorAll(".mode-link");
const modeNavbarCollapse = document.getElementById("modeNav");

// --- Constants ---
const CLASS_ORDER = [
  "Flanker",
  "Trooper",
  "Arsonist",
  "Annihilator",
  "Brute",
  "Mechanic",
  "Doctor",
  "Marksman",
  "Agent",
];
const SLOT_ORDER = [
  "Primary",
  "Secondary",
  "Watches",
  "Cloak",
  "Melee",
  "PDA",
  "Sapper",
];
const ALL_CLASS_SLOT_ORDER = ["Melee"];
const OFFCLASSES = [
  "Arsonist",
  "Brute",
  "Mechanic",
  "Marksman",
  "Agent",
];
const MODE_MAP = {
  "6v6": {
    key: "status6v6",
    title: "6v6 Whitelist",
    showOffclassIndicator: true,
  },
  highlander: {
    key: "statusHL",
    title: "Highlander Whitelist",
    showOffclassIndicator: false,
  },
  prolander: {
    key: "statusPro",
    title: "Prolander Whitelist",
    showOffclassIndicator: false,
  },
  "4v4_5v5": {
    key: "status4v5",
    title: "4v4/5v5 Whitelist",
    showOffclassIndicator: true,
  },
};
const BANNED_CLASSES_MAP = {
  status4v5: [],
  status6v6: [],
  statusHL: [],
  statusPro: [],
};
// --- End Constants ---

// --- Helper Functions ---
function createMessageColumn(containerClass, messageClass, htmlContent) {
  return `
        <div class="col-12 ${containerClass}">
             <div class="${messageClass}">${htmlContent}</div>
        </div>`;
}

function getStatusClass(statusText) {
  // Only includes weapon statuses needed for this page
  if (!statusText) return "weapon-status";
  const lowerStatus = statusText.toLowerCase().replace(/\s+/g, "-");

  if (lowerStatus === "allowed") return "weapon-status status-allowed";
  if (lowerStatus === "banned") return "weapon-status status-banned";
  if (lowerStatus === "always") return "weapon-status status-always";
  if (lowerStatus === "testing") return "weapon-status status-testing";
  if (lowerStatus === "under-review" || lowerStatus === "review")
    return "weapon-status status-under-review";
  // Add other weapon-specific statuses if any

  return "weapon-status"; // Default
}
// --- End Helper Functions ---

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  loadWeaponData();
  window.addEventListener("hashchange", handleWeaponRouteChange);

  modeNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (modeNavbarCollapse && modeNavbarCollapse.classList.contains("show")) {
        const toggler = document.querySelector(
          '.navbar-toggler[data-bs-target="#modeNav"]'
        );
        if (toggler) {
          const collapseInstance =
            bootstrap.Collapse.getInstance(modeNavbarCollapse);
          if (collapseInstance) collapseInstance.hide();
          else toggler.click(); // Fallback if instance isn't found
        }
      }
    });
  });

  // Listener for main navbar collapse (optional, good UX)
  const mainNavbarCollapse = document.getElementById("mainNavContent");
  const mainToggler = document.querySelector(
    '.navbar-toggler[data-bs-target="#mainNavContent"]'
  );
  // Adjust the selector ('#mainNavContent .nav-link') if your main nav links have a different structure or class.
  const mainNavLinks = mainNavbarCollapse
    ? mainNavbarCollapse.querySelectorAll(".nav-link")
    : [];

  if (mainNavbarCollapse && mainToggler && mainNavLinks.length > 0) {
    mainNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (mainNavbarCollapse.classList.contains("show")) {
          const collapseInstance =
            bootstrap.Collapse.getInstance(mainNavbarCollapse);
          if (collapseInstance) {
            collapseInstance.hide();
          } else if (mainToggler) {
            // Fallback if Bootstrap JS isn't fully loaded or instance isn't attached
            mainToggler.click();
          }
        }
      });
    });
  }
});
// --- End Event Listeners ---

// --- Data Loading ---
async function loadWeaponData() {
  if (weaponContentArea) {
    weaponContentArea.innerHTML = createMessageColumn(
      "loading-container",
      "loading-message",
      '<div class="spinner"></div><p class="mt-3">Loading weapon data...</p>'
    );
  }

  try {
    // Fetch ONLY weapon data
    const response = await fetch(
      "https://raw.githubusercontent.com/Kritzleague/banjson/refs/heads/main/weapons-whitelist.json"
    );

    if (response.ok) {
      whitelistData = await response.json();
      handleWeaponRouteChange(); // Display based on initial hash or default
    } else {
      console.error(
        `HTTP error loading whitelist! status: ${response.status}`
      );
      whitelistData = null;
      if (weaponContentArea) {
        weaponContentArea.innerHTML = createMessageColumn(
          "error-message-container",
          "error-message",
          "Failed to load weapon data."
        );
      }
      if (weaponPageTitle) weaponPageTitle.textContent = "Error";
    }
  } catch (error) {
    console.error("Error loading weapon data:", error);
    whitelistData = null;
    if (weaponContentArea) {
      weaponContentArea.innerHTML = createMessageColumn(
        "error-message-container",
        "error-message",
        "Failed to load weapon data."
      );
    }
    if (weaponPageTitle) weaponPageTitle.textContent = "Error";
  }
}
// --- End Data Loading ---

// --- Routing and Display Logic ---
function handleWeaponRouteChange() {
  // Removed silent parameter
  if (!weaponContentArea || !weaponPageTitle) return;

  const hash = window.location.hash.substring(1);
  const modeInfo = MODE_MAP[hash];
  const currentModeKey = modeInfo ? modeInfo.key : null;
  const shouldShowOffclassIndicator = modeInfo
    ? modeInfo.showOffclassIndicator
    : false;

  modeNavLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${hash}`);
  });

  // Always update UI since this is the only content pane
  weaponContentArea.classList.add("loading");
  requestAnimationFrame(() => {
    weaponContentArea.innerHTML = "";
    if (whitelistData && modeInfo) {
      weaponPageTitle.textContent = modeInfo.title;
      displayWeaponMode(currentModeKey, shouldShowOffclassIndicator);
    } else if (!whitelistData && hash) {
      weaponPageTitle.textContent = "Error";
      weaponContentArea.innerHTML = createMessageColumn(
        "error-message-container",
        "error-message",
        `Could not load weapon whitelist data. Cannot display mode: ${hash}`
      );
    } else if (!whitelistData && !hash) {
      weaponPageTitle.textContent = "Error";
      weaponContentArea.innerHTML = createMessageColumn(
        "error-message-container",
        "error-message",
        "Failed to load weapon whitelist data."
      );
    } else {
      // Handles case where data loaded but hash is invalid/missing
      weaponPageTitle.textContent = "Weapon Whitelist";
      weaponContentArea.innerHTML = createMessageColumn(
        "main-page-content-container",
        "main-page-content",
        "<p>Select a game mode from the navigation above to view its specific weapon whitelist.</p>"
      );
    }
    setTimeout(() => weaponContentArea.classList.remove("loading"), 50);
  });
}

function displayWeaponMode(modeKey, shouldShowOffclassIndicator) {
  if (!weaponContentArea || !whitelistData) return;

  const fragment = document.createDocumentFragment();
  const bannedClassesForMode = BANNED_CLASSES_MAP[modeKey] || [];

  CLASS_ORDER.forEach((className) => {
    if (!whitelistData[className]) return;
    const isClassBanned = bannedClassesForMode.includes(className);
    const isOffclass = OFFCLASSES.includes(className);
    const classData = whitelistData[className];
    let hasContentForClass = false;
    const colDiv = document.createElement("div");
    colDiv.className = "col-12 col-md-6 col-lg-4 mb-4 class-column";
    if (isClassBanned) colDiv.classList.add("class-banned");
    const cardDiv = document.createElement("div");
    cardDiv.className = "card whitelist-card h-100";
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header class-header";
    cardHeader.appendChild(document.createTextNode(className));
    if (isOffclass && !isClassBanned && shouldShowOffclassIndicator) {
      const indicatorSpan = document.createElement("span");
      indicatorSpan.className = "offclass-indicator";
      indicatorSpan.textContent = "Offclass";
      cardHeader.appendChild(indicatorSpan);
    }
    cardDiv.appendChild(cardHeader);
    const cardBody = document.createElement("div");
    cardBody.className = "card-body";
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
            const classFolderName = className.toLowerCase().replace(/\s+/g, "_");
            // Adjusted icon path
            imgIcon.src = `../../icons/${classFolderName}/${item.icon}`;
            imgIcon.alt = item.weapon;
            imgIcon.className = "weapon-icon";
            imgIcon.loading = "lazy";
            imgIcon.onerror = function () {
              this.style.display = "none";
              console.warn(`Icon not found: ${this.src}`);
            };
            listItem.appendChild(imgIcon);
          }
          const weaponNameSpan = document.createElement("span");
          weaponNameSpan.className = "weapon-name";
          weaponNameSpan.textContent = item.weapon;
          listItem.appendChild(weaponNameSpan);
          const weaponStatusSpan = document.createElement("span");
          const status = item[modeKey] || "N/A";
          weaponStatusSpan.textContent = status;
          weaponStatusSpan.className = getStatusClass(status);
          listItem.appendChild(weaponStatusSpan);

          // Show reason indicator if banReason exists, regardless of status
          if (item.banReason && item.banReason.trim() !== "") {
            const reasonIndicator = document.createElement("span");
            reasonIndicator.className = "ban-reason-indicator";
            reasonIndicator.textContent = "?";
            reasonIndicator.setAttribute("data-tippy-content", item.banReason);
            listItem.appendChild(reasonIndicator);
          }

          weaponList.appendChild(listItem);
        });
        cardBody.appendChild(weaponList);
      }
    });
    if (isClassBanned) {
      const overlayDiv = document.createElement("div");
      overlayDiv.className = "banned-overlay";
      overlayDiv.innerHTML = `<span class="banned-overlay-text">Banned</span>`;
      colDiv.appendChild(overlayDiv);
    }
    if (hasContentForClass || isClassBanned) {
      cardDiv.appendChild(cardBody);
      colDiv.appendChild(cardDiv);
      fragment.appendChild(colDiv);
    }
  });

  const allClassData = whitelistData["All-Class"];
  if (allClassData) {
    let hasAllClassContent = false;
    const colDiv = document.createElement("div");
    colDiv.className = "col-12 mb-4 all-class-column";
    const cardDiv = document.createElement("div");
    cardDiv.className = "card whitelist-card";
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header class-header";
    cardHeader.textContent = "All-Class";
    cardDiv.appendChild(cardHeader);
    const cardBody = document.createElement("div");
    cardBody.className = "card-body";
    (ALL_CLASS_SLOT_ORDER || Object.keys(allClassData)).forEach((slotName) => {
      if (allClassData[slotName] && allClassData[slotName].length > 0) {
        hasAllClassContent = true;
        const slotData = allClassData[slotName];
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
            // Adjusted icon path
            imgIcon.src = `../../icons/all-class/${item.icon}`;
            imgIcon.alt = item.weapon;
            imgIcon.className = "weapon-icon";
            imgIcon.loading = "lazy";
            imgIcon.onerror = function () {
              this.style.display = "none";
              console.warn(`Icon not found: ${this.src}`);
            };
            listItem.appendChild(imgIcon);
          }
          const weaponNameSpan = document.createElement("span");
          weaponNameSpan.className = "weapon-name";
          weaponNameSpan.textContent = item.weapon;
          listItem.appendChild(weaponNameSpan);
          const weaponStatusSpan = document.createElement("span");
          const status = item[modeKey] || "N/A";
          weaponStatusSpan.textContent = status;
          weaponStatusSpan.className = getStatusClass(status);
          listItem.appendChild(weaponStatusSpan);

          // Show reason indicator if banReason exists, regardless of status
          if (item.banReason && item.banReason.trim() !== "") {
            const reasonIndicator = document.createElement("span");
            reasonIndicator.className = "ban-reason-indicator";
            reasonIndicator.textContent = "?";
            reasonIndicator.setAttribute("data-tippy-content", item.banReason);
            listItem.appendChild(reasonIndicator);
          }

          weaponList.appendChild(listItem);
        });
        cardBody.appendChild(weaponList);
      }
    });
    if (hasAllClassContent) {
      cardDiv.appendChild(cardBody);
      colDiv.appendChild(cardDiv);
      fragment.appendChild(colDiv);
    }
  }

  weaponContentArea.innerHTML = "";
  weaponContentArea.appendChild(fragment);

  // Initialize Tippy tooltips after content is added
  tippy("#whitelist-content [data-tippy-content]", {
    allowHTML: true,
    placement: "right",
    animation: "fade",
    theme: "custom-dark", // Ensure you have CSS for this theme
  });
}
// --- End Routing and Display Logic ---
