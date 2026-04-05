import {
  initGCPD,
  loadGCPDRows,
  resetGCPD,
} from "../features/general/general.js";
import {
  initTF2,
  loadTF2Rows,
  resetTF2,
} from "../features/map-history/map-history.js";
import { parseCSVFile, parseCSVText } from "../shared/csv/parser.js";
import {
  initTopLists,
  loadTopListRows,
  resetTopLists,
} from "../features/top-lists/top-lists.js";
import { loadMapNames } from "../shared/data/map-index-service.js";
import { loadMapModes } from "../shared/data/map-modes-service.js";

// ── MAP-PREFIX GAME MODE LOGIC ───────────────────────────────────────────────

// CTF maps that are actually Mannpower mode
const MANNPOWER_MAPS = new Set([
  "ctf_foundry",
  "ctf_hellfire",
  "ctf_gorge",
  "ctf_thundermountain",
]);

const GAME_MODE_NAMES = {
  pl:       "Payload",
  plr:      "Payload Race",
  cp:       "Control Points",
  cppl:     "Control Point Payload",
  koth:     "King of the Hill",
  "2koth":  "Double KOTH",
  ctf:      "Capture the Flag",
  mann:     "Mannpower",
  mvm:      "Mann vs Machine",
  arena:    "Arena",
  sd:       "Special Delivery",
  tc:       "Territorial Control",
  pass:     "PASS Time",
  pd:       "Player Destruction",
  rd:       "Robot Destruction",
  vsh:      "Versus Saxton Hale",
  tow:      "Tug of War",
  zi:       "Zombie Infection",
  // Wiki-derived sub-modes (populated when map-modes.json is present)
  ad:       "Attack/Defend",
  medieval: "Medieval Mode",
  htf:      "Hold the Flag",
  tr:       "Training Mode",
};

function getGameModeFromMapName(mapName) {
  if (!mapName || mapName.startsWith("Unknown")) return null;
  // Handle 2koth_ prefix before lookup since the wiki folds it into "koth"
  if (mapName.startsWith("2koth_")) return "2koth";
  // Authoritative wiki lookup (populated after map-modes.json loads)
  if (exclModeLookup[mapName]) return exclModeLookup[mapName];
  // Fallback: Mannpower exception then plain prefix split
  if (MANNPOWER_MAPS.has(mapName)) return "mann";
  return mapName.split("_")[0] || null;
}

import {
  prefersReducedMotion,
  fadeIn,
  fadeOut,
  staggerReveal,
  slideTabIndicator as slideIndicator,
  animateTabIn,
  animateTabButtons,
  setOpacity,
} from "../shared/core/animations.js";

const tabGeneral = document.getElementById("tab-general");
const tabTF2 = document.getElementById("tab-tf2");
const tabLists = document.getElementById("tab-lists");
const tabNav = document.getElementById("tab-nav");
const tabIndicator = document.getElementById("tab-indicator");
const sectionGeneral = document.getElementById("general-app");
const sectionTF2 = document.getElementById("tf2-app");
const sectionLists = document.getElementById("lists-app");

const globalUpload = document.getElementById("global-upload");
const globalFileInput = document.getElementById("global-file-input");
const globalLoading = document.getElementById("global-loading");
const clearBtn = document.getElementById("clear-data");
const helpTrigger = document.getElementById("help-trigger");
const exclusionBar = document.getElementById("exclusion-bar");

// Keep containers hidden until data is provided
let hasData = false;

// ── EXCLUSION STATE ──────────────────────────────────────────────────────────
let allRawRows = [];
// Map<key, 'include'|'exclude'> — absent means off
let mapIndexStates = new Map();
let gameModeStates = new Map();
let exclMapIndexKey = null;
let exclMapNames = {};
// Authoritative map→mode lookup from wiki scrape (empty until map-modes.json loads)
let exclModeLookup = {};

// Tri-state cycling
const ITEM_STATES = ["off", "include", "exclude"];
const STATE_ICONS = {
  off:     "ri-checkbox-blank-line",
  include: "ri-checkbox-line",
  exclude: "ri-close-circle-line",
};

// Exclusion bar DOM refs (populated in initExclusionBar)
let exclMapsBtn, exclMapsLabel, exclMapsPanel, exclMapsList, exclMapsSearch;
let exclModesBtn, exclModesLabel, exclModesPanel, exclModesList, exclModesSearch;
let exclClearBtn, exclSummaryEl;

// Wrapper for slide indicator to include nav element
function slideTabIndicator(activeBtn, animate = true) {
  slideIndicator(tabIndicator, activeBtn, tabNav, animate);
}

function setActive(which) {
  const tabs = [
    { key: "general", btn: tabGeneral, sec: sectionGeneral },
    { key: "tf2", btn: tabTF2, sec: sectionTF2 },
    { key: "lists", btn: tabLists, sec: sectionLists },
  ];
  tabs.forEach(({ key, btn, sec }) => {
    const active = key === which;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active);
    
    // Slide indicator to active tab
    if (active && hasData) {
      slideTabIndicator(btn);
    }
    
    if (hasData) {
      if (active) {
        sec.classList.remove("hidden");
        animateTabIn(sec);
      } else {
        sec.classList.add("hidden");
      }
    } else {
      sec.classList.add("hidden");
    }
  });
}

tabGeneral.addEventListener("click", () => setActive("general"));
tabTF2.addEventListener("click", () => setActive("tf2"));
tabLists.addEventListener("click", () => setActive("lists"));

// Initialize both apps' internal UI (filters, charts scaffolding)
initGCPD();
initTF2();
initTopLists();
initExclusionBar();

// Global upload interactions
globalUpload.addEventListener("click", () => globalFileInput.click());
globalUpload.addEventListener("dragover", (e) => {
  e.preventDefault();
  globalUpload.classList.add("dragover");
});
globalUpload.addEventListener("dragleave", () => {
  globalUpload.classList.remove("dragover");
});
globalUpload.addEventListener("drop", async (e) => {
  e.preventDefault();
  globalUpload.classList.remove("dragover");
  const file = e.dataTransfer?.files?.[0];
  if (file) await handleFile(file);
});
globalFileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (file) await handleFile(file);
});

// Optional: paste CSV text
window.addEventListener("paste", async (e) => {
  const text = e.clipboardData?.getData("text/plain") || "";
  if (text && /,|;|\t/.test(text)) {
    await handleText(text);
  }
});

clearBtn.addEventListener("click", () => {
  // Animate out current content
  const activeSection = document.querySelector("#general-app:not(.hidden), #tf2-app:not(.hidden), #lists-app:not(.hidden)");
  
  const finishClear = () => {
    // Reset all modules
    resetGCPD();
    resetTF2();
    resetTopLists();
    hasData = false;
    allRawRows = [];
    mapIndexStates.clear();
    gameModeStates.clear();
    exclusionBar.classList.add("hidden");
    // Hide sections and tabs
    sectionGeneral.classList.add("hidden");
    sectionTF2.classList.add("hidden");
    sectionLists.classList.add("hidden");
    tabNav?.classList.add("hidden");
    clearBtn.classList.add("hidden");
    globalFileInput.value = "";
    
    // Show upload zone with animation
    globalUpload.classList.remove("hidden");
    helpTrigger?.classList.remove("hidden");
    
    fadeIn(globalUpload, { scale: true });
    fadeIn(helpTrigger, { delay: 0.1 });
    
    // Scroll to top and set tab back to General
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActive("general");
  };
  
  // Animate out if possible, otherwise instant
  if (!prefersReducedMotion && activeSection) {
    fadeOut(activeSection, { y: -10, onComplete: finishClear });
    fadeOut(tabNav);
  } else {
    finishClear();
  }
});

async function handleFile(file) {
  showGlobalLoading(true);
  try {
    const { data } = await parseCSVFile(file, {});
    await handleRows(data || []);
  } catch (e) {
    console.error(e);
    alert("Failed to parse CSV. See console for details.");
  } finally {
    showGlobalLoading(false);
  }
}

async function handleText(text) {
  showGlobalLoading(true);
  try {
    const { data } = await parseCSVText(text, {});
    await handleRows(data || []);
  } catch (e) {
    console.error(e);
    alert("Failed to parse pasted CSV text. See console for details.");
  } finally {
    showGlobalLoading(false);
  }
}

async function handleRows(rows) {
  allRawRows = rows;
  mapIndexStates.clear();
  gameModeStates.clear();

  // Populate exclusion bar (loads map names + builds checkboxes)
  await populateExclusionBar(rows);
  exclusionBar.classList.remove("hidden");

  // Feed all visualizers. Each will decide what to show from the rows.
  loadGCPDRows(rows);
  loadTF2Rows(rows);
  loadTopListRows(rows);

  // We now have data: reveal via tabs, hide upload, show clear
  hasData = true;
  globalUpload.classList.add("hidden");
  helpTrigger?.classList.add("hidden");
  clearBtn.classList.remove("hidden");
  
  // Show tab nav with animation
  tabNav?.classList.remove("hidden");
  
  // Initialize tab indicator position (after nav is visible)
  requestAnimationFrame(() => {
    slideTabIndicator(tabGeneral, false); // No animation on first load
  });
  
  // Reset tabNav opacity and animate buttons
  setOpacity(tabNav, 1);
  const buttons = tabNav?.querySelectorAll(".tab-btn");
  if (buttons) animateTabButtons(buttons);

  // Default active tab = General
  setActive("general");
}

function showGlobalLoading(show) {
  globalLoading.classList.toggle("hidden", !show);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCLUSION BAR
// ═══════════════════════════════════════════════════════════════════════════

function initExclusionBar() {
  exclMapsBtn = document.getElementById("excl-maps-btn");
  exclMapsLabel = document.getElementById("excl-maps-label");
  exclMapsPanel = document.getElementById("excl-maps-panel");
  exclMapsList = document.getElementById("excl-maps-list");
  exclMapsSearch = document.getElementById("excl-maps-search");
  exclModesBtn = document.getElementById("excl-modes-btn");
  exclModesLabel = document.getElementById("excl-modes-label");
  exclModesPanel = document.getElementById("excl-modes-panel");
  exclModesList = document.getElementById("excl-modes-list");
  exclModesSearch = document.getElementById("excl-modes-search");
  exclClearBtn = document.getElementById("excl-clear");
  exclSummaryEl = document.getElementById("excl-summary");

  exclMapsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !exclMapsPanel.classList.contains("hidden");
    closeAllExclDropdowns();
    if (!isOpen) openExclDropdown(exclMapsPanel, exclMapsBtn);
  });

  exclModesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !exclModesPanel.classList.contains("hidden");
    closeAllExclDropdowns();
    if (!isOpen) openExclDropdown(exclModesPanel, exclModesBtn);
  });

  // Close dropdowns on outside click
  document.addEventListener("click", closeAllExclDropdowns);
  exclMapsPanel.addEventListener("click", (e) => e.stopPropagation());
  exclModesPanel.addEventListener("click", (e) => e.stopPropagation());

  bindExclusionSearch(exclMapsSearch, exclMapsList);
  bindExclusionSearch(exclModesSearch, exclModesList);

  exclClearBtn.addEventListener("click", () => {
    mapIndexStates.clear();
    gameModeStates.clear();
    exclMapsList.querySelectorAll(".excl-item").forEach((item) => {
      item.dataset.state = "off";
      item.querySelector(".excl-state-icon").className = `excl-state-icon ${STATE_ICONS.off}`;
    });
    exclModesList.querySelectorAll(".excl-item").forEach((item) => {
      item.dataset.state = "off";
      item.querySelector(".excl-state-icon").className = `excl-state-icon ${STATE_ICONS.off}`;
    });
    if (exclMapsSearch) exclMapsSearch.value = "";
    if (exclModesSearch) exclModesSearch.value = "";
    applyExclusionSearch(exclMapsList, "");
    applyExclusionSearch(exclModesList, "");
    updateExclUI();
    redispatch();
  });
}

function bindExclusionSearch(inputEl, listEl) {
  if (!inputEl || !listEl) return;

  const runSearch = () => {
    applyExclusionSearch(listEl, inputEl.value);
  };

  ["input", "change", "search", "keyup"].forEach((eventName) => {
    inputEl.addEventListener(eventName, runSearch);
  });

  ["click", "mousedown", "pointerdown", "focus", "keydown"].forEach((eventName) => {
    inputEl.addEventListener(eventName, (e) => e.stopPropagation());
  });
}

function applyExclusionSearch(listEl, query) {
  if (!listEl) return;
  const normalizedQuery = String(query || "").trim().toLowerCase();
  listEl.querySelectorAll(".excl-item").forEach((item) => {
    const haystack =
      item.dataset.searchText ||
      [
        item.querySelector(".excl-item-name")?.textContent || "",
        item.querySelector(".excl-item-prefix")?.textContent || "",
      ]
        .join(" ")
        .toLowerCase();
    const matches = !normalizedQuery || haystack.includes(normalizedQuery);
    item.hidden = false;
    item.style.display = matches ? "" : "none";
  });
}

function openExclDropdown(panel, btn) {
  panel.classList.remove("hidden");
  btn.classList.add("open");
}

function closeAllExclDropdowns() {
  exclMapsPanel?.classList.add("hidden");
  exclMapsBtn?.classList.remove("open");
  exclModesPanel?.classList.add("hidden");
  exclModesBtn?.classList.remove("open");
}

async function populateExclusionBar(rows) {
  if (exclMapsSearch) exclMapsSearch.value = "";
  if (exclModesSearch) exclModesSearch.value = "";

  try {
    exclMapNames = await loadMapNames();
  } catch {
    exclMapNames = {};
  }
  // Load wiki-derived mode lookup; silently degrades to {} if not generated yet
  exclModeLookup = await loadMapModes();

  // Detect map_index key (case-insensitive)
  exclMapIndexKey = Object.keys(rows[0] || {}).find(
    (k) => k.toLowerCase() === "map_index"
  ) || null;

  // Collect unique map index values, sorted by resolved name
  const mapIdxSet = new Set();
  rows.forEach((r) => {
    if (exclMapIndexKey) {
      const v = String(r[exclMapIndexKey] || "").trim();
      if (v) mapIdxSet.add(v);
    }
  });
  const mapIdxValues = [...mapIdxSet].sort((a, b) => {
    const na = exclMapNames[a]?.name || `zzz_${a}`;
    const nb = exclMapNames[b]?.name || `zzz_${b}`;
    return na.localeCompare(nb);
  });

  // Collect unique game mode prefixes derived from resolved map names
  const modeSet = new Set();
  rows.forEach((r) => {
    const mapName = resolveExclMapName(r);
    const mode = getGameModeFromMapName(mapName);
    if (mode) modeSet.add(mode);
  });
  // Sort by display name, unknown prefixes fall back to the raw prefix
  const modes = [...modeSet].sort((a, b) => {
    const na = GAME_MODE_NAMES[a] || a.toUpperCase();
    const nb = GAME_MODE_NAMES[b] || b.toUpperCase();
    return na.localeCompare(nb);
  });

  // Helper: cycle an item through off → include → exclude → off
  function cycleItemState(item, stateMap, key) {
    const cur = item.dataset.state;
    const next = ITEM_STATES[(ITEM_STATES.indexOf(cur) + 1) % ITEM_STATES.length];
    item.dataset.state = next;
    item.querySelector(".excl-state-icon").className = `excl-state-icon ${STATE_ICONS[next]}`;
    if (next === "off") stateMap.delete(key);
    else stateMap.set(key, next);
    updateExclUI();
    redispatch();
  }

  // Build maps list
  if (mapIdxValues.length === 0) {
    exclMapsList.innerHTML = '<div class="excl-empty">No map data</div>';
  } else {
    exclMapsList.innerHTML = mapIdxValues
      .map((idx) => {
        const name = exclMapNames[idx]?.name || `Unknown (${idx})`;
        return `<div class="excl-item" data-state="off" data-map-index="${idx}"
          role="button" tabindex="0" title="Click to cycle: off → include → exclude">
          <i class="excl-state-icon ${STATE_ICONS.off}"></i>
          <span class="excl-item-name">${name}</span>
        </div>`;
      })
      .join("");
    exclMapsList.querySelectorAll(".excl-item").forEach((item) => {
      const name = item.querySelector(".excl-item-name")?.textContent || "";
      item.dataset.searchText = name.toLowerCase();
      const handler = () => cycleItemState(item, mapIndexStates, item.dataset.mapIndex);
      item.addEventListener("click", handler);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
      });
    });
  }
  applyExclusionSearch(exclMapsList, exclMapsSearch?.value || "");

  // Build modes list
  if (modes.length === 0) {
    exclModesList.innerHTML = '<div class="excl-empty">No mode data</div>';
  } else {
    // Modes that don't have their own map prefix (wiki sub-modes of cp_)
    const NO_OWN_PREFIX = new Set(["ad", "medieval", "tr"]);
    exclModesList.innerHTML = modes
      .map((mode) => {
        const displayName = GAME_MODE_NAMES[mode] || mode.toUpperCase();
        const prefixHint = NO_OWN_PREFIX.has(mode)
          ? ""
          : `<span class="excl-item-prefix">${mode}_</span>`;
        return `<div class="excl-item" data-state="off" data-mode="${mode}"
          role="button" tabindex="0" title="Click to cycle: off → include → exclude">
          <i class="excl-state-icon ${STATE_ICONS.off}"></i>
          <span class="excl-item-name">${displayName}</span>
          ${prefixHint}
        </div>`;
      })
      .join("");
    exclModesList.querySelectorAll(".excl-item").forEach((item) => {
      const name = item.querySelector(".excl-item-name")?.textContent || "";
      const prefix = item.querySelector(".excl-item-prefix")?.textContent || "";
      item.dataset.searchText = `${name} ${prefix}`.toLowerCase();
      const handler = () => cycleItemState(item, gameModeStates, item.dataset.mode);
      item.addEventListener("click", handler);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
      });
    });
  }
  applyExclusionSearch(exclModesList, exclModesSearch?.value || "");

  updateExclUI();
}

function updateExclUI() {
  exclMapsLabel.textContent = "Maps";
  exclModesLabel.textContent = "Game Modes";

  const total = mapIndexStates.size + gameModeStates.size;
  exclClearBtn.style.display = total > 0 ? "" : "none";

  if (total === 0) {
    exclSummaryEl.textContent = "";
    return;
  }
  const filtered = applyExclusions(allRawRows);
  exclSummaryEl.textContent =
    `${filtered.length.toLocaleString()} / ${allRawRows.length.toLocaleString()} shown`;
}

function resolveExclMapName(row) {
  if (exclMapIndexKey && row[exclMapIndexKey]) {
    const mid = String(row[exclMapIndexKey]).trim();
    if (exclMapNames[mid]?.name) return exclMapNames[mid].name;
  }
  return row.map_name || row.map || row.mapid || row.mapId || "";
}

function applyExclusions(rows) {
  const mapsActive = mapIndexStates.size > 0 && exclMapIndexKey;
  const modesActive = gameModeStates.size > 0;
  if (!mapsActive && !modesActive) return rows;

  // Pre-compute include/exclude sets for fast lookups
  const mapIncludes = new Set();
  const mapExcludes = new Set();
  for (const [k, v] of mapIndexStates) {
    (v === "include" ? mapIncludes : mapExcludes).add(k);
  }

  const modeIncludes = new Set();
  const modeExcludes = new Set();
  for (const [k, v] of gameModeStates) {
    (v === "include" ? modeIncludes : modeExcludes).add(k);
  }

  return rows.filter((r) => {
    if (mapsActive) {
      const idx = String(r[exclMapIndexKey] || "").trim();
      if (mapExcludes.has(idx)) return false;
      if (mapIncludes.size > 0 && !mapIncludes.has(idx)) return false;
    }

    if (modesActive) {
      const mode = getGameModeFromMapName(resolveExclMapName(r));
      if (modeExcludes.has(mode)) return false;
      if (modeIncludes.size > 0 && (!mode || !modeIncludes.has(mode))) return false;
    }

    return true;
  });
}

function redispatch() {
  const filtered = applyExclusions(allRawRows);
  loadGCPDRows(filtered);
  loadTF2Rows(filtered);
  loadTopListRows(filtered);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL-TRIGGERED EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

const siteHeader = document.querySelector(".site-header");

// Header shadow on scroll
let lastScrollY = 0;
let ticking = false;

function updateHeaderShadow() {
  const scrolled = window.scrollY > 20;
  siteHeader.classList.toggle("scrolled", scrolled);
  ticking = false;
}

window.addEventListener("scroll", () => {
  lastScrollY = window.scrollY;
  if (!ticking) {
    window.requestAnimationFrame(updateHeaderShadow);
    ticking = true;
  }
}, { passive: true });

// ═══════════════════════════════════════════════════════════════════════════
// HELP MODAL
// ═══════════════════════════════════════════════════════════════════════════

const helpModal = document.getElementById("help-modal");
const helpModalClose = document.getElementById("help-modal-close");
const copyScriptBtn = document.getElementById("copy-script-btn");

// The fetcher script to copy
const FETCHER_SCRIPT_URL = "./scripts/fetcher.js";
let cachedScript = null;

function openHelpModal() {
  helpModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeHelpModal() {
  helpModal.classList.add("hidden");
  document.body.style.overflow = "";
}

helpTrigger?.addEventListener("click", openHelpModal);
helpModalClose?.addEventListener("click", closeHelpModal);

// Close on backdrop click
helpModal?.addEventListener("click", (e) => {
  if (e.target === helpModal) closeHelpModal();
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !helpModal.classList.contains("hidden")) {
    closeHelpModal();
  }
});

// Copy script to clipboard
copyScriptBtn?.addEventListener("click", async () => {
  try {
    // Fetch script if not cached
    if (!cachedScript) {
      const res = await fetch(FETCHER_SCRIPT_URL);
      cachedScript = await res.text();
    }
    
    await navigator.clipboard.writeText(cachedScript);
    
    // Show feedback in button
    copyScriptBtn.textContent = "Copied!";
    
    setTimeout(() => {
      copyScriptBtn.innerHTML = '<i class="ri-file-copy-line"></i> Copy Script to Clipboard';
    }, 2000);
  } catch (err) {
    console.error("Failed to copy script:", err);
    alert("Failed to copy. Please try again.");
  }
});

// Start on General tab with upload visible
setActive("general");
