// /kritzleague/weapons/scripts.js
let weaponData = null;
let classRestrictionData = null; // To store class restrictions
const whitelistContentArea = document.getElementById("whitelist-content");
const weaponPageTitle = document.getElementById("weapon-page-title");
const modeNavLinks = document.querySelectorAll(".mode-link");
const modeNavbarCollapse = document.getElementById("modeNav");

// --- Constants for Weapon Modes ---
const WEAPON_MODE_MAP = {
  "6v6": { key: "status6v6", title: "6v6 Weapon Whitelist" },
  "highlander": { key: "statusHL", title: "Highlander Weapon Whitelist" },
  "prolander": { key: "statusPro", title: "Prolander Weapon Whitelist" },
  "4v4_5v5": { key: "status4v5", title: "4v4/5v5 Weapon Whitelist" },
};

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
  // "All-Class", // Keep All-Class last // Commented out All-Class from explicit order
];

// --- End Constants ---

// --- Helper Functions ---
function createMessageColumn(containerClass, messageClass, htmlContent) {
  return `
        <div class="col-12 ${containerClass}">
             <div class="${messageClass}">${htmlContent}</div>
        </div>`;
}

function getStatusClass(statusText) {
  if (!statusText) return "weapon-status";
  const lowerStatus = statusText.toLowerCase().replace(/\s+/g, "-");

  // Weapon Statuses
  if (lowerStatus === "allowed") return "weapon-status status-allowed";
  if (lowerStatus === "banned") return "weapon-status status-banned";
  if (lowerStatus === "always") return "weapon-status status-always";
  if (lowerStatus === "testing") return "weapon-status status-testing";
  if (lowerStatus === "under-review" || lowerStatus === "review")
    return "weapon-status status-under-review";
  if (lowerStatus === "not-used") return "weapon-status status-not-used";

  // Map Statuses (Include for potential reuse or if needed)
  if (lowerStatus === "in-rotation") return "weapon-status status-in-rotation";
  if (lowerStatus === "out-of-rotation")
    return "weapon-status status-out-of-rotation";
  if (lowerStatus === "undecided") return "weapon-status status-undecided";
  if (lowerStatus === "anchor") return "weapon-status status-anchor";
  if (lowerStatus === "vaulted") return "weapon-status status-vaulted";
  if (lowerStatus === "experimenting") return "weapon-status status-testing";

  return "weapon-status"; // Default
}
// --- End Helper Functions ---

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  loadWhitelistData(); // Will now load both weapon and class data
  window.addEventListener("hashchange", handleWeaponRouteChange);

  modeNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (modeNavbarCollapse && modeNavbarCollapse.classList.contains("show")) {
        const toggler = document.querySelector(
          '.navbar-toggler[data-bs-target="#modeNav"]',
        );
        if (toggler) {
          const collapseInstance =
            bootstrap.Collapse.getInstance(modeNavbarCollapse);
          if (collapseInstance) collapseInstance.hide();
          else toggler.click();
        }
      }
    });
  });

  const mainNavbarCollapse = document.getElementById("mainNavContent");
  const mainToggler = document.querySelector(
    '.navbar-toggler[data-bs-target="#mainNavContent"]',
  );
  if (mainNavbarCollapse && mainToggler) {
    const mainNavLinks = document.querySelectorAll(".main-nav-link");
    mainNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (mainNavbarCollapse.classList.contains("show")) {
          const collapseInstance =
            bootstrap.Collapse.getInstance(mainNavbarCollapse);
          if (collapseInstance) collapseInstance.hide();
          else mainToggler.click();
        }
      });
    });
  }
});
// --- End Event Listeners ---

// --- Data Loading ---
async function loadWhitelistData() {
  console.log("Attempting to load whitelist data..."); // Debug log
  if (whitelistContentArea) {
    whitelistContentArea.innerHTML = createMessageColumn(
      "loading-container",
      "loading-message",
      '<div class="spinner"></div><p class="mt-3">Loading whitelist data...</p>',
    );
  }

  let weaponFetchOk = false;
  let classFetchOk = false;

  try {
    const weaponUrl =
      "weapons-whitelist.json";
    // This assumes class-restrictions.json is in the SAME directory as the weapons/index.html page
    const classUrl = "class-restrictions.json";

    console.log(`Fetching weapon data from: ${weaponUrl}`); // Debug log
    console.log(`Fetching class data from: ${classUrl}`); // Debug log

    const [weaponResponse, classResponse] = await Promise.all([
      fetch(weaponUrl).catch((e) => {
        console.error("Weapon fetch network error:", e);
        return { ok: false, status: "Network Error", error: e };
      }),
      fetch(classUrl).catch((e) => {
        console.error("Class fetch network error:", e);
        return { ok: false, status: "Network Error", error: e };
      }),
    ]);

    // Process Weapon Data
    if (weaponResponse.ok) {
      try {
        weaponData = await weaponResponse.json();
        weaponFetchOk = true;
        console.log("Weapon data loaded and parsed successfully.");
      } catch (e) {
        console.error("Error parsing weapon JSON:", e);
        weaponData = null;
      }
    } else {
      console.error(
        `HTTP error loading weapons! Status: ${weaponResponse.status}`,
        weaponResponse.error || "",
      );
      weaponData = null;
    }

    // Process Class Restriction Data
    if (classResponse.ok) {
      try {
        classRestrictionData = await classResponse.json();
        classFetchOk = true;
        console.log("Class restriction data loaded and parsed successfully.");
      } catch (e) {
        console.error("Error parsing class restriction JSON:", e);
        classRestrictionData = {}; // Fallback
      }
    } else {
      console.warn( // Use warn as it might be non-critical
        `HTTP error loading class restrictions! Status: ${classResponse.status}. Proceeding without restriction indicators.`,
        classResponse.error || "",
      );
      classRestrictionData = {}; // Fallback to empty object
    }

    // Proceed ONLY if weapon data loaded successfully
    if (weaponFetchOk) {
      console.log("Weapon data OK, calling handleWeaponRouteChange...");
      handleWeaponRouteChange(); // This function will handle removing the spinner
    } else {
      // Critical error: Weapon data failed
      throw new Error("Failed to load required weapon data."); // Throw error to be caught below
    }
  } catch (error) {
    // Catch errors from fetch failures, .json() parsing, or the explicit throw above
    console.error("Error in loadWhitelistData:", error);
    weaponData = null;
    classRestrictionData = {}; // Fallback
    if (whitelistContentArea) {
      whitelistContentArea.innerHTML = createMessageColumn(
        "error-message-container",
        "error-message",
        `Failed to load necessary data. Please check console (F12) for details. Error: ${error.message}`,
      );
    }
    if (weaponPageTitle) weaponPageTitle.textContent = "Error Loading Data";
    // Ensure spinner is removed on error
    if (whitelistContentArea) {
      whitelistContentArea.classList.remove("loading"); // Remove loading class here on error
      const spinner = whitelistContentArea.querySelector(".loading-container");
      if (spinner) spinner.remove(); // Remove the specific loading container
    }
  }
}
// --- End Data Loading ---

// --- Routing and Display Logic ---
function handleWeaponRouteChange() {
  console.log("handleWeaponRouteChange triggered"); // Debug log
  if (!whitelistContentArea || !weaponPageTitle) {
    console.error(
      "Missing critical HTML elements (whitelistContentArea or weaponPageTitle)",
    );
    return;
  }

  const hash = window.location.hash.substring(1);
  const modeInfo = WEAPON_MODE_MAP[hash];
  const currentModeKey = modeInfo ? modeInfo.key : null;
  console.log(`Routing: hash='${hash}', modeKey='${currentModeKey}'`); // Debug log

  modeNavLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${hash}`);
  });

  requestAnimationFrame(() => {
    console.log("requestAnimationFrame callback executing..."); // Debug log
    try {
      whitelistContentArea.innerHTML = ""; // Clear previous cards

      if (weaponData && modeInfo) {
        console.log("Displaying weapons for mode:", currentModeKey);
        weaponPageTitle.textContent = modeInfo.title;
        displayWeapons(currentModeKey); // Pass the mode key
        console.log("Applying class restrictions for mode:", currentModeKey);
        handleClassRestrictions(currentModeKey); // Apply class restrictions
      } else if (!weaponData && hash) {
        weaponPageTitle.textContent = "Error";
        whitelistContentArea.innerHTML = createMessageColumn(
          "error-message-container",
          "error-message",
          `Could not load weapon data. Cannot display mode: ${hash}`,
        );
        console.warn("Weapon data missing, cannot display mode:", hash); // Debug log
      } else if (!weaponData && !hash) {
        weaponPageTitle.textContent = "Error";
        whitelistContentArea.innerHTML = createMessageColumn(
          "error-message-container",
          "error-message",
          "Failed to load weapon data.",
        );
        console.warn("Weapon data missing, no mode selected."); // Debug log
      } else {
        weaponPageTitle.textContent = "Weapon Whitelist";
        whitelistContentArea.innerHTML = createMessageColumn(
          "main-page-content-container",
          "main-page-content",
          "<p>Select a game mode from the navigation above to view its specific weapon whitelist.</p>",
        );
        console.log("Displaying default 'Select Mode' message."); // Debug log
      }
    } catch (displayError) {
      console.error("Error during display update:", displayError);
      if (whitelistContentArea) {
        whitelistContentArea.innerHTML = createMessageColumn(
          "error-message-container",
          "error-message",
          "An error occurred while displaying weapon data. Check console (F12).",
        );
      }
    } finally {
      console.log("Removing loading class (finally block).");
      setTimeout(() => {
        if (whitelistContentArea) {
          whitelistContentArea.classList.remove("loading");
          const initialLoader =
            whitelistContentArea.querySelector(".loading-container");
          if (initialLoader && whitelistContentArea.children.length > 1) {
            initialLoader.remove();
          }
        }
      }, 0);
    }
  });
}

function displayWeapons(modeKey) {
  console.log("Entering displayWeapons for mode:", modeKey); // Debug log
  if (!whitelistContentArea || !weaponData || !modeKey) {
    console.error("displayWeapons called with invalid state:", {
      hasArea: !!whitelistContentArea,
      hasData: !!weaponData,
      modeKey,
    });
    if (whitelistContentArea && !modeKey) {
      console.warn("displayWeapons called without a valid modeKey.");
    }
    return;
  }

  const fragment = document.createDocumentFragment();

  CLASS_ORDER.forEach((className) => {
    if (weaponData[className]) {
      const classData = weaponData[className];
      const colDiv = document.createElement("div");

      // Default column classes for standard class cards
      let columnClasses = `col-12 col-md-6 col-lg-4 mb-4 class-column ${className.toLowerCase()}-column`;

      /* // Commented out All-Class specific column width override
      // Check if it's the All-Class card
      if (className === "All-Class") {
          // Override default column classes for full width
          columnClasses = `col-12 mb-4 class-column all-class-column`; // Use col-12 for full width
          console.log("Applying full-width (col-12) to All-Class card."); // Debug log
      }
      */

      colDiv.className = columnClasses; // Apply the determined classes

      const cardDiv = document.createElement("div");
      cardDiv.className = "card whitelist-card h-100";

      const cardHeader = document.createElement("div");
      cardHeader.className = "card-header class-header";

      // --- START HEADER MODIFICATION ---
      // 1. Create span for the class name text
      const classNameSpan = document.createElement("span");
      /* // Commented out All-Class specific name display
      classNameSpan.textContent =
        className === "All-Class"
          ? "All Class"
          : className.replace(/([A-Z])/g, " $1").trim();
      */
      classNameSpan.textContent = className.replace(/([A-Z])/g, " $1").trim(); // Default name display
      cardHeader.appendChild(classNameSpan); // Append the name span first

      // 2. Check for Off-Class/Banned status
      const classStatusInfo = classRestrictionData?.[className];
      const currentClassStatus = classStatusInfo?.[modeKey];

      if (currentClassStatus === "Off-Class" || currentClassStatus === "Banned") {
        const indicatorGroup = document.createElement("div");
        const offClassSpan = document.createElement("span");
        offClassSpan.className = "offclass-indicator";
        offClassSpan.textContent = currentClassStatus;
        indicatorGroup.appendChild(offClassSpan);

        if (classStatusInfo?.info && classStatusInfo.info.trim() !== "") {
          const restrictionInfoSpan = document.createElement("span");
          restrictionInfoSpan.className = "restriction-info-indicator ms-1";
          restrictionInfoSpan.textContent = "?";
          restrictionInfoSpan.setAttribute(
            "data-tippy-content",
            classStatusInfo.info,
          );
          indicatorGroup.appendChild(restrictionInfoSpan);
        }
        cardHeader.appendChild(indicatorGroup);
      }
      // --- END HEADER MODIFICATION ---

      cardDiv.appendChild(cardHeader);

      const cardBody = document.createElement("div");
      cardBody.className = "card-body";

      Object.keys(classData).forEach((slot) => {
        if (!Array.isArray(classData[slot])) {
          console.warn(
            `Invalid data for ${className} -> ${slot}, expected array.`,
          );
          return;
        }

        const slotHeading = document.createElement("h6");
        slotHeading.className = "slot-heading";
        slotHeading.textContent = slot;
        cardBody.appendChild(slotHeading);

        const weaponList = document.createElement("ul");
        weaponList.className = "list-unstyled weapon-list";

        classData[slot].forEach((weapon) => {
          if (
            !weapon ||
            typeof weapon !== "object" ||
            !weapon.weapon ||
            !weapon.icon
          ) {
            console.warn(
              `Skipping invalid weapon entry in ${className} -> ${slot}:`,
              weapon,
            );
            return;
          }

          const weaponItem = document.createElement("li");
          weaponItem.className = "weapon-item";

          const icon = document.createElement("img");
          const lowerClassName = className.toLowerCase();
          /* // Commented out All-Class specific icon path
          // *** Special case for "All Class" icon path ***
          const iconPathClass =
            lowerClassName === 'all-class' ? 'all-class' : lowerClassName;
          */
          const iconPathClass = lowerClassName; // Default icon path based on className
          icon.src = `../../icons/${iconPathClass}/${weapon.icon}`;
          icon.alt = weapon.weapon;
          icon.className = "weapon-icon";
          icon.loading = "lazy";
          icon.onerror = function () {
            this.style.visibility = "hidden";
            console.warn(`Icon not found: ${this.src}`);
          };

          const nameSpan = document.createElement("span");
          nameSpan.className = "weapon-name";
          nameSpan.textContent = weapon.weapon;

          const statusSpan = document.createElement("span");
          const currentStatus = weapon[modeKey] || "N/A";
          statusSpan.textContent = currentStatus;
          statusSpan.className = getStatusClass(currentStatus);

          weaponItem.appendChild(icon);
          weaponItem.appendChild(nameSpan);
          weaponItem.appendChild(statusSpan);

          const banReason = weapon.banReason || "";
          const notes = weapon.notes || "";
          let tooltipContent = "";

          if (currentStatus.toLowerCase() === "banned" && banReason.trim() !== "") {
            tooltipContent = banReason;
          } else if (notes.trim() !== "") {
            tooltipContent = notes;
          }

          if (tooltipContent) {
            const reasonIndicator = document.createElement("span");
            reasonIndicator.className = "ban-reason-indicator";
            reasonIndicator.textContent = "?";
            reasonIndicator.setAttribute("data-tippy-content", tooltipContent);
            weaponItem.appendChild(reasonIndicator);
          }

          weaponList.appendChild(weaponItem);
        });
        cardBody.appendChild(weaponList);
      });

      cardDiv.appendChild(cardBody);
      colDiv.appendChild(cardDiv);
      fragment.appendChild(colDiv);
    } else {
      console.warn(`No weapon data found for class: ${className}`);
    }
  });

  whitelistContentArea.appendChild(fragment);
  console.log("Finished appending weapon cards to DOM.");

  tippy("#whitelist-content [data-tippy-content]", {
    allowHTML: true,
    placement: "top",
    animation: "fade",
    theme: "custom-dark",
  });

  anime({
    targets: "#whitelist-content .whitelist-card",
    opacity: [0, 1],
    translateY: [10, 0],
    duration: 400,
    delay: anime.stagger(50),
    easing: "easeOutQuad",
    complete: () => console.log("Card animation complete."),
  });
}

function handleClassRestrictions(modeKey) {
  console.log("Entering handleClassRestrictions for mode:", modeKey);
  if (!classRestrictionData) {
    console.warn(
      "Cannot apply class restrictions: classRestrictionData is missing.",
    );
    return;
  }

  CLASS_ORDER.forEach((className) => {
    const classStatusInfo = classRestrictionData[className];
    if (!classStatusInfo) {
      console.warn(`No restriction info found for class: ${className}`);
      return;
    }

    const currentStatus = classStatusInfo[modeKey];
    const columnSelector = `.${className.toLowerCase()}-column`;
    const columnDiv = whitelistContentArea.querySelector(columnSelector);

    if (columnDiv) {
      const existingOverlay = columnDiv.querySelector(".banned-overlay");
      if (existingOverlay) {
        existingOverlay.remove();
      }
      columnDiv.classList.remove("class-banned");

      if (currentStatus === "Banned") {
        console.log(`Applying 'Banned' overlay to ${className}`);
        columnDiv.classList.add("class-banned");
        const overlayDiv = document.createElement("div");
        overlayDiv.className = "banned-overlay";
        overlayDiv.innerHTML = `<span class="banned-overlay-text">BANNED</span>`;
        columnDiv.appendChild(overlayDiv);
      }
    } else {
      console.warn(
        `Could not find column element for class: ${className} (${columnSelector})`,
      );
    }
  });
  console.log("Finished applying class restrictions.");
}

// --- End Display Logic ---
