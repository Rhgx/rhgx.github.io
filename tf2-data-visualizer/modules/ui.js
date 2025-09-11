import { initGCPD, loadGCPDRows, resetGCPD } from "./gcpd.js";
import { initTF2, loadTF2Rows, resetTF2 } from "./tf2.js";
import { parseCSVFile, parseCSVText } from "./csv.js";

const tabGeneral = document.getElementById("tab-general");
const tabTF2 = document.getElementById("tab-tf2");
const sectionGeneral = document.getElementById("general-app");
const sectionTF2 = document.getElementById("tf2-app");

const globalUpload = document.getElementById("global-upload");
const globalFileInput = document.getElementById("global-file-input");
const globalLoading = document.getElementById("global-loading");
const clearBtn = document.getElementById("clear-data");

// Keep containers hidden until data is provided
let hasData = false;

function setActive(tab) {
  const isGeneral = tab === "general";
  // Always update tab styling
  if (isGeneral) {
    tabGeneral.classList.add("bg-teal-600", "text-white");
    tabTF2.classList.remove("bg-teal-700", "text-white");
  } else {
    tabTF2.classList.add("bg-teal-700", "text-white");
    tabGeneral.classList.remove("bg-teal-600", "text-white");
  }

  // Only toggle section visibility if we already have data loaded
  if (hasData) {
    sectionGeneral.classList.toggle("hidden", !isGeneral);
    sectionTF2.classList.toggle("hidden", isGeneral);
  } else {
    sectionGeneral.classList.add("hidden");
    sectionTF2.classList.add("hidden");
  }
}

tabGeneral.addEventListener("click", () => setActive("general"));
tabTF2.addEventListener("click", () => setActive("tf2"));

// Initialize both apps' internal UI (filters, charts scaffolding)
initGCPD();
initTF2();

// Global upload interactions
globalUpload.addEventListener("click", () => globalFileInput.click());
globalUpload.addEventListener("dragover", (e) => {
  e.preventDefault();
  globalUpload.classList.add("ring-2", "ring-teal-500/50");
});
globalUpload.addEventListener("dragleave", () => {
  globalUpload.classList.remove("ring-2", "ring-teal-500/50");
});
globalUpload.addEventListener("drop", async (e) => {
  e.preventDefault();
  globalUpload.classList.remove("ring-2", "ring-teal-500/50");
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
  // Reset both modules
  resetGCPD();
  resetTF2();
  hasData = false;
  // Hide sections, show upload
  sectionGeneral.classList.add("hidden");
  sectionTF2.classList.add("hidden");
  globalUpload.classList.remove("hidden");
  clearBtn.classList.add("hidden");
  globalFileInput.value = "";
  // Scroll to top and set tab back to General
  window.scrollTo({ top: 0, behavior: "smooth" });
  setActive("general");
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
  // Feed both visualizers. Each will decide what to show from the rows.
  loadGCPDRows(rows);
  loadTF2Rows(rows);

  // We now have data: reveal via tabs, hide upload, show clear
  hasData = true;
  globalUpload.classList.add("hidden");
  clearBtn.classList.remove("hidden");

  // Default active tab = General
  setActive("general");
}

function showGlobalLoading(show) {
  globalLoading.classList.toggle("hidden", !show);
}

// Start on General tab with upload visible
setActive("general");