import { debounce } from "./utils.js";
import { VirtualTable } from "./virtual-table.js";

// Module-scoped refs/state
let viz;
let emptyState;

let topNSelect;
let sortSelect;
let chartSearchInput;
let tableSearchInput;
let tableSummary;

let totalMatchesEl;
let uniqueMapsEl;
let mostPlayedEl;

let downloadBtn;
let resetBtn;

let tableContainer;

// State
let mapChart = null;
let mapNames = {};
let mapData = {}; // { mapIndex: count }
let totalMatches = 0;
let uniqueCount = 0;

// Base list for table (sorted globally per current sort mode)
let baseTableEntriesSorted = [];
let lastChartCount = 0;
let virtualTable = null;

export function initTF2() {
  // DOM
  viz = document.getElementById("t-visualization");
  emptyState = document.getElementById("t-empty");

  topNSelect = document.getElementById("t-top-n");
  sortSelect = document.getElementById("t-sort");
  chartSearchInput = document.getElementById("t-chart-search");
  tableSearchInput = document.getElementById("t-table-search");
  tableSummary = document.getElementById("t-table-summary");

  totalMatchesEl = document.getElementById("t-total");
  uniqueMapsEl = document.getElementById("t-unique");
  mostPlayedEl = document.getElementById("t-most");

  downloadBtn = document.getElementById("t-download");
  resetBtn = document.getElementById("t-reset");

  tableContainer = document.getElementById("t-table-container");

  // Init map index from JSON
  (async function initMapIndex() {
    try {
      const res = await fetch("./modules/map-index.json", {
        cache: "no-store",
      });
      const json = await res.json();
      mapNames = json.master_maps_list || {};
    } catch (e) {
      console.warn("Failed to load map index JSON", e);
      mapNames = {};
    }
  })();

  // Controls (no file handling here; rows come from global upload)
  downloadBtn.addEventListener("click", downloadChart);
  resetBtn.addEventListener("click", resetTF2);
  topNSelect.addEventListener("change", rebuildVisualization);
  sortSelect.addEventListener("change", rebuildVisualization);
  chartSearchInput.addEventListener(
    "input",
    debounce(rebuildVisualization, 150)
  );
  tableSearchInput.addEventListener("input", debounce(applyTableSearch, 150));
}

// Public API
export function loadTF2Rows(rows) {
  // Parse rows (objects) to mapData
  if (!Array.isArray(rows) || !rows.length) {
    emptyState.classList.remove("hidden");
    viz.classList.add("hidden");
    return;
  }

  const hasMapIndex = Object.keys(rows[0] || {}).some(
    (h) => String(h).toLowerCase() === "map_index"
  );
  if (!hasMapIndex) {
    emptyState.classList.remove("hidden");
    viz.classList.add("hidden");
    return;
  }

  mapData = {};
  totalMatches = 0;

  for (const r of rows) {
    const key = Object.keys(r).find(
      (h) => String(h).toLowerCase() === "map_index"
    );
    const raw = (r[key] ?? "").toString().trim();
    if (!raw) continue;
    totalMatches++;
    mapData[raw] = (mapData[raw] || 0) + 1;
  }

  uniqueCount = Object.keys(mapData).length;
  updateStats();
  rebuildVisualization();

  viz.classList.remove("hidden");
  emptyState.classList.add("hidden");
}

export function resetTF2() {
  if (mapChart) {
    mapChart.destroy();
    mapChart = null;
  }
  mapData = {};
  totalMatches = 0;
  uniqueCount = 0;

  viz.classList.add("hidden");
  emptyState.classList.add("hidden");
  tableSummary.textContent = "";
  totalMatchesEl.textContent = "0";
  uniqueMapsEl.textContent = "0";
  mostPlayedEl.textContent = "-";
  if (virtualTable) virtualTable.setData([]);
  chartSearchInput.value = "";
  tableSearchInput.value = "";
  topNSelect.value = "20";
  sortSelect.value = "countDesc";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Internals

function updateStats() {
  totalMatchesEl.textContent = totalMatches.toLocaleString();
  uniqueMapsEl.textContent = uniqueCount.toLocaleString();

  let mostPlayedMap = null;
  let maxCount = 0;
  for (const [mid, count] of Object.entries(mapData)) {
    if (count > maxCount) {
      maxCount = count;
      mostPlayedMap = mid;
    }
  }
  const mostName = mapNames[mostPlayedMap]?.name || `Unknown (${mostPlayedMap})`;
  mostPlayedEl.textContent = `${mostName} (${maxCount} ${
    maxCount === 1 ? "time" : "times"
  })`;
}

function rebuildVisualization() {
  if (!totalMatches) return;
  const baseEntries = Object.entries(mapData);

  const sortMode = sortSelect.value;
  const sortedEntries = baseEntries.slice().sort((a, b) => {
    const [amid, ac] = a;
    const [bmid, bc] = b;
    if (sortMode === "countDesc") return bc - ac;
    if (sortMode === "countAsc") return ac - bc;

    const aname = mapNames[amid]?.name || `Unknown (${amid})`;
    const bname = mapNames[bmid]?.name || `Unknown (${bmid})`;
    if (sortMode === "alphaAsc") return aname.localeCompare(bname);
    if (sortMode === "alphaDesc") return bname.localeCompare(aname);
    return bc - ac;
  });

  baseTableEntriesSorted = sortedEntries;

  const q = (chartSearchInput.value || "").toLowerCase().trim();
  let chartFiltered = sortedEntries.filter(([mid]) => {
    if (!q) return true;
    const name = mapNames[mid]?.name || `Unknown (${mid})`;
    return name.toLowerCase().includes(q);
  });

  const topN = topNSelect.value;
  const chartLimited = topN === "all" ? chartFiltered : chartFiltered.slice(0, +topN);
  lastChartCount = chartLimited.length;

  updateChart(chartLimited);
  applyTableSearch();
}

function applyTableSearch() {
  const q = (tableSearchInput.value || "").toLowerCase().trim();
  const filtered = baseTableEntriesSorted.filter(([mid]) => {
    if (!q) return true;
    const name = mapNames[mid]?.name || `Unknown (${mid})`;
    return name.toLowerCase().includes(q);
  });
  populateTable(filtered, lastChartCount);
}

function updateChart(sortedLimitedEntries) {
  const labels = sortedLimitedEntries.map(
    ([mid]) => mapNames[mid]?.name || `Unknown (${mid})`
  );
  const data = sortedLimitedEntries.map(([, count]) => count);

  // Colors
  const backgroundColors = sortedLimitedEntries.map((_, i) => {
    const hue = (i * 137.5) % 360;
    return `hsl(${hue}, 70%, 55%)`;
  });
  const borderColors = backgroundColors.map((c) => c.replace("55%", "42%"));

  const ctx = document.getElementById("t-map-chart").getContext("2d");
  const gridColor = "rgba(148,163,184,0.18)";
  const tickColor = "rgba(226,232,240,0.95)";

  if (mapChart) {
    mapChart.data.labels = labels;
    mapChart.data.datasets[0].data = data;
    mapChart.data.datasets[0].backgroundColor = backgroundColors;
    mapChart.data.datasets[0].borderColor = borderColors;
    mapChart.update();
    return;
  }

  mapChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Matches Played",
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.8,
          categoryPercentage: 0.7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { bottom: 18 } },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: tickColor,
            autoSkip: false,
            maxRotation: 40,
            minRotation: 0,
            padding: 6,
            callback: function (val) {
              const label = this.getLabelForValue(val) || "";
              const parts = label.split("_");
              const joined = [];
              let line = "";
              for (const p of parts) {
                const candidate = line ? line + "_" + p : p;
                if (candidate.length > 14) {
                  if (line) joined.push(line);
                  line = p;
                } else {
                  line = candidate;
                }
              }
              if (line) joined.push(line);
              const lines = joined.slice(0, 2);
              if (joined.length > 2) {
                lines[1] = lines[1].slice(0, 13) + "…";
              }
              return lines;
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: tickColor, precision: 0 },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.95)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context) => {
              const count = context.raw;
              const pct = ((count / totalMatches) * 100).toFixed(1);
              return ` Matches: ${count}  (${pct}%)`;
            },
            title: (items) => {
              const t = items[0]?.label || "";
              return t.replaceAll("_", "_\u200b");
            },
          },
        },
      },
      animation: { duration: 500, easing: "easeOutCubic" },
    },
  });
}

function populateTable(sortedEntries, chartingCount) {
  const headers = ["Map", "Play Count", "Percentage"];

  // Transform entries to row objects for VirtualTable
  const rows = sortedEntries.map(([mid, count]) => {
    const mapName = mapNames[mid]?.name || `Unknown (${mid})`;
    const percentage = ((count / totalMatches) * 100).toFixed(1);
    return {
      map: mapName,
      count,
      percentage: `${percentage}%`,
    };
  });

  if (!virtualTable) {
    virtualTable = new VirtualTable(tableContainer, {
      headers: headers,
      rowKeys: ["map", "count", "percentage"],
    });
  }
  virtualTable.setData(rows);

  tableSummary.textContent = `${rows.length.toLocaleString()} rows · charting ${chartingCount.toLocaleString()} map(s)`;
}

function downloadChart() {
  if (!mapChart) return;
  const link = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    link.href = mapChart.toBase64Image("image/png", 1);
  } catch {
    link.href = mapChart.toBase64Image();
  }
  link.download = `tf2_map_play_history_${ts}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}