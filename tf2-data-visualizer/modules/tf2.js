import { debounce, cleanNumeric } from "./utils.js";
import { VirtualTable } from "./virtual-table.js";

// Module-scoped refs/state
let viz;
let emptyState;

let topNSelect;
let metricSelect;
let sortSelect;
let chartSearchInput;
let tableSearchInput;
let tableSummary;

let totalMatchesEl;
let uniqueMapsEl;
let mostPlayedEl;
let totalHoursEl;

let downloadBtn;
let resetBtn;

let tableContainer;

// State
let mapChart = null;
let mapNames = {};
let mapData = {}; // { mapIndex: count }
let mapDurationData = {}; // { mapIndex: seconds }
let totalMatches = 0;
let uniqueCount = 0;
let totalDurationSeconds = 0;
let hasMatchDurationColumn = false;
let lastChartMetric = "count";

// Base list for table (sorted globally per current sort mode)
let baseTableEntriesSorted = [];
let lastChartCount = 0;
let virtualTable = null;
let tableLayoutKey = "";

export function initTF2() {
  // DOM
  viz = document.getElementById("t-visualization");
  emptyState = document.getElementById("t-empty");

  topNSelect = document.getElementById("t-top-n");
  metricSelect = document.getElementById("t-metric");
  sortSelect = document.getElementById("t-sort");
  chartSearchInput = document.getElementById("t-chart-search");
  tableSearchInput = document.getElementById("t-table-search");
  tableSummary = document.getElementById("t-table-summary");

  totalMatchesEl = document.getElementById("t-total");
  uniqueMapsEl = document.getElementById("t-unique");
  mostPlayedEl = document.getElementById("t-most");
  totalHoursEl = document.getElementById("t-hours");

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
  metricSelect.addEventListener("change", rebuildVisualization);
  sortSelect.addEventListener("change", rebuildVisualization);
  chartSearchInput.addEventListener(
    "input",
    debounce(rebuildVisualization, 150)
  );
  tableSearchInput.addEventListener("input", debounce(applyTableSearch, 150));

  setMetricAvailability(false);
}

// Public API
export function loadTF2Rows(rows) {
  // Parse rows (objects) to mapData
  if (!Array.isArray(rows) || !rows.length) {
    setMetricAvailability(false);
    emptyState.classList.remove("hidden");
    viz.classList.add("hidden");
    return;
  }

  const firstRow = rows[0] || {};
  const mapIndexKey = findColumnKey(firstRow, "map_index");

  if (!mapIndexKey) {
    setMetricAvailability(false);
    emptyState.classList.remove("hidden");
    viz.classList.add("hidden");
    return;
  }

  const durationKey = findColumnKey(firstRow, "match_duration");
  hasMatchDurationColumn = Boolean(durationKey);
  setMetricAvailability(hasMatchDurationColumn);

  mapData = {};
  mapDurationData = {};
  totalMatches = 0;
  totalDurationSeconds = 0;

  for (const r of rows) {
    const raw = (r[mapIndexKey] ?? "").toString().trim();
    if (!raw) continue;

    totalMatches++;
    mapData[raw] = (mapData[raw] || 0) + 1;

    if (durationKey) {
      const seconds = Math.max(0, cleanNumeric(r[durationKey]));
      if (seconds > 0) {
        mapDurationData[raw] = (mapDurationData[raw] || 0) + seconds;
        totalDurationSeconds += seconds;
      }
    }
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
  mapDurationData = {};
  totalMatches = 0;
  uniqueCount = 0;
  totalDurationSeconds = 0;
  hasMatchDurationColumn = false;
  lastChartMetric = "count";
  tableLayoutKey = "";

  viz.classList.add("hidden");
  emptyState.classList.add("hidden");
  tableSummary.textContent = "";
  totalMatchesEl.textContent = "0";
  uniqueMapsEl.textContent = "0";
  mostPlayedEl.textContent = "-";
  totalHoursEl.textContent = "N/A";

  if (virtualTable) virtualTable.setData([]);

  chartSearchInput.value = "";
  tableSearchInput.value = "";
  topNSelect.value = "20";
  metricSelect.value = "count";
  sortSelect.value = "countDesc";
  setMetricAvailability(false);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Internals

function updateStats() {
  totalMatchesEl.textContent = totalMatches.toLocaleString();
  uniqueMapsEl.textContent = uniqueCount.toLocaleString();
  totalHoursEl.textContent = hasMatchDurationColumn
    ? formatHoursMinutes(totalDurationSeconds)
    : "N/A";

  let mostPlayedMap = null;
  let maxCount = 0;
  for (const [mid, count] of Object.entries(mapData)) {
    if (count > maxCount) {
      maxCount = count;
      mostPlayedMap = mid;
    }
  }

  if (!mostPlayedMap) {
    mostPlayedEl.textContent = "-";
    return;
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
    if (sortMode === "hoursDesc") return (mapDurationData[bmid] || 0) - (mapDurationData[amid] || 0);
    if (sortMode === "hoursAsc") return (mapDurationData[amid] || 0) - (mapDurationData[bmid] || 0);

    const aname = mapNames[amid]?.name || `Unknown (${amid})`;
    const bname = mapNames[bmid]?.name || `Unknown (${bmid})`;
    if (sortMode === "alphaAsc") return aname.localeCompare(bname);
    if (sortMode === "alphaDesc") return bname.localeCompare(aname);
    return bc - ac;
  });

  baseTableEntriesSorted = sortedEntries;

  const q = (chartSearchInput.value || "").toLowerCase().trim();
  const chartFiltered = sortedEntries.filter(([mid]) => {
    if (!q) return true;
    const name = mapNames[mid]?.name || `Unknown (${mid})`;
    return name.toLowerCase().includes(q);
  });

  const topN = topNSelect.value;
  const chartLimited =
    topN === "all" ? chartFiltered : chartFiltered.slice(0, +topN);
  lastChartCount = chartLimited.length;

  updateChart(chartLimited, getChartMetric(sortMode));
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

function updateChart(sortedLimitedEntries, metric) {
  const labels = sortedLimitedEntries.map(
    ([mid]) => mapNames[mid]?.name || `Unknown (${mid})`
  );
  const data = sortedLimitedEntries.map(([mid, count]) =>
    metric === "hours" ? mapSecondsToHours(mapDurationData[mid] || 0) : count
  );
  const datasetLabel = metric === "hours" ? "Hours Played" : "Matches Played";

  // Colors
  const backgroundColors = sortedLimitedEntries.map((_, i) => {
    const hue = (i * 137.5) % 360;
    return `hsl(${hue}, 70%, 55%)`;
  });
  const borderColors = backgroundColors.map((c) => c.replace("55%", "42%"));

  const yTickCallback = (value) =>
    metric === "hours" ? `${Number(value).toFixed(1)}h` : value;

  const tooltipLabelCallback = (context) => {
    if (metric === "hours") {
      const [mid] = sortedLimitedEntries[context.dataIndex] || [];
      const seconds = mapDurationData[mid] || 0;
      const hours = mapSecondsToHours(seconds);
      const pct = totalDurationSeconds
        ? ((seconds / totalDurationSeconds) * 100).toFixed(1)
        : "0.0";
      return ` Time: ${formatHoursMinutes(seconds)} (${hours.toFixed(2)}h, ${pct}%)`;
    }

    const count = Number(context.raw) || 0;
    const pct = ((count / totalMatches) * 100).toFixed(1);
    return ` Matches: ${count} (${pct}%)`;
  };

  const ctx = document.getElementById("t-map-chart").getContext("2d");
  const gridColor = "rgba(232, 212, 168, 0.6)"; // cream-dark
  const tickColor = "#4a3d30"; // ink-light

  if (mapChart && lastChartMetric !== metric) {
    mapChart.destroy();
    mapChart = null;
  }

  if (mapChart) {
    mapChart.data.labels = labels;
    mapChart.data.datasets[0].label = datasetLabel;
    mapChart.data.datasets[0].data = data;
    mapChart.data.datasets[0].backgroundColor = backgroundColors;
    mapChart.data.datasets[0].borderColor = borderColors;
    mapChart.options.scales.y.ticks.precision = metric === "hours" ? 1 : 0;
    mapChart.options.scales.y.ticks.callback = yTickCallback;
    mapChart.options.plugins.tooltip.callbacks.label = tooltipLabelCallback;
    mapChart.update();
    return;
  }

  mapChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
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
            font: { family: "'TF2 Secondary', Arial, sans-serif", size: 10 },
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
                const candidate = line ? `${line}_${p}` : p;
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
                lines[1] = `${lines[1].slice(0, 13)}...`;
              }
              return lines;
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            precision: metric === "hours" ? 1 : 0,
            callback: yTickCallback,
            font: { family: "'OCR-A', Consolas, monospace" },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(42, 33, 24, 0.95)", // ink
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: tooltipLabelCallback,
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

  lastChartMetric = metric;
}

function populateTable(sortedEntries, chartingCount) {
  const includeHours = hasMatchDurationColumn;
  const headers = includeHours
    ? ["Map", "Play Count", "Time Played", "Percentage"]
    : ["Map", "Play Count", "Percentage"];
  const rowKeys = includeHours
    ? ["map", "count", "hours", "percentage"]
    : ["map", "count", "percentage"];

  // Transform entries to row objects for VirtualTable
  const rows = sortedEntries.map(([mid, count]) => {
    const mapName = mapNames[mid]?.name || `Unknown (${mid})`;
    const percentage = ((count / totalMatches) * 100).toFixed(1);
    const row = {
      map: mapName,
      count,
      percentage: `${percentage}%`,
    };

    if (includeHours) {
      row.hours = formatHoursMinutes(mapDurationData[mid] || 0);
    }

    return row;
  });

  const nextLayoutKey = rowKeys.join("|");
  if (!virtualTable || tableLayoutKey !== nextLayoutKey) {
    if (virtualTable) virtualTable.destroy();
    virtualTable = new VirtualTable(tableContainer, {
      headers,
      rowKeys,
    });
    tableLayoutKey = nextLayoutKey;
  }

  virtualTable.setData(rows);

  const rowLabel = rows.length === 1 ? "row" : "rows";
  const mapLabel = chartingCount === 1 ? "map" : "maps";
  tableSummary.textContent = `${rows.length.toLocaleString()} ${rowLabel} | charting ${chartingCount.toLocaleString()} ${mapLabel}`;
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

function setMetricAvailability(enabled) {
  const hoursOption = metricSelect?.querySelector('option[value="hours"]');
  if (hoursOption) {
    hoursOption.disabled = !enabled;
  }

  const hoursSortDesc = sortSelect?.querySelector('option[value="hoursDesc"]');
  const hoursSortAsc = sortSelect?.querySelector('option[value="hoursAsc"]');
  if (hoursSortDesc) hoursSortDesc.disabled = !enabled;
  if (hoursSortAsc) hoursSortAsc.disabled = !enabled;

  if (!enabled && metricSelect) {
    metricSelect.value = "count";
  }
  if (
    !enabled &&
    sortSelect &&
    (sortSelect.value === "hoursDesc" || sortSelect.value === "hoursAsc")
  ) {
    sortSelect.value = "countDesc";
  }
}

function getChartMetric(sortMode = sortSelect?.value || "") {
  const isHoursSort = sortMode === "hoursDesc" || sortMode === "hoursAsc";
  if (isHoursSort && hasMatchDurationColumn) {
    if (metricSelect && metricSelect.value !== "hours") {
      metricSelect.value = "hours";
    }
    return "hours";
  }

  const selected = metricSelect?.value || "count";
  if (selected === "hours" && hasMatchDurationColumn) return "hours";
  return "count";
}

function mapSecondsToHours(seconds) {
  const val = Number(seconds) || 0;
  return val / 3600;
}

function formatHoursMinutes(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  if (totalSeconds === 0) return "0m";

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes === 0) return "<1m";

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function findColumnKey(row, wantedKey) {
  const wanted = String(wantedKey).toLowerCase();
  return Object.keys(row || {}).find((k) => String(k).toLowerCase() === wanted);
}
