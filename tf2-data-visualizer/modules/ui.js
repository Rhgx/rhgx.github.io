import { initGCPD, loadGCPDRows, resetGCPD } from "./gcpd.js";
import { initTF2, loadTF2Rows, resetTF2 } from "./tf2.js";
import { parseCSVFile, parseCSVText } from "./csv.js";
import {
  initTopLists,
  loadTopListRows,
  resetTopLists,
} from "./toplists.js";

const tabGeneral = document.getElementById("tab-general");
const tabTF2 = document.getElementById("tab-tf2");
const tabLists = document.getElementById("tab-lists");
const sectionGeneral = document.getElementById("general-app");
const sectionTF2 = document.getElementById("tf2-app");
const sectionLists = document.getElementById("lists-app");

const globalUpload = document.getElementById("global-upload");
const globalFileInput = document.getElementById("global-file-input");
const globalLoading = document.getElementById("global-loading");
const clearBtn = document.getElementById("clear-data");

// Keep containers hidden until data is provided
let hasData = false;

function setActive(which) {
  const tabs = [
    { key: "general", btn: tabGeneral, sec: sectionGeneral },
    { key: "tf2", btn: tabTF2, sec: sectionTF2 },
    { key: "lists", btn: tabLists, sec: sectionLists },
  ];
  tabs.forEach(({ key, btn, sec }) => {
    const active = key === which;
    btn.classList.toggle("bg-teal-600", active);
    btn.classList.toggle("text-white", active);
    if (hasData) {
      sec.classList.toggle("hidden", !active);
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
  // Reset all modules
  resetGCPD();
  resetTF2();
  resetTopLists();
  hasData = false;
  // Hide sections, show upload
  sectionGeneral.classList.add("hidden");
  sectionTF2.classList.add("hidden");
  sectionLists.classList.add("hidden");
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
  // Feed all visualizers. Each will decide what to show from the rows.
  loadGCPDRows(rows);
  loadTF2Rows(rows);
  loadTopListRows(rows);

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