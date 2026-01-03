import { initGCPD, loadGCPDRows, resetGCPD } from "./gcpd.js";
import { initTF2, loadTF2Rows, resetTF2 } from "./tf2.js";
import { parseCSVFile, parseCSVText } from "./csv.js";
import {
  initTopLists,
  loadTopListRows,
  resetTopLists,
} from "./toplists.js";
import {
  prefersReducedMotion,
  fadeIn,
  fadeOut,
  staggerReveal,
  slideTabIndicator as slideIndicator,
  animateTabIn,
  animateTabButtons,
  setOpacity,
} from "./animations.js";

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

// Keep containers hidden until data is provided
let hasData = false;

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
const FETCHER_SCRIPT_URL = "./fetcher/fetcher.js";
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