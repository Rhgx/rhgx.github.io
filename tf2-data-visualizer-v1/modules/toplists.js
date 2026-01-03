import { debounce, formatDuration, cleanNumeric } from "./utils.js";
import { VirtualTable } from "./virtual-table.js";

// DOM refs
let metricSelect;
let orderSelect;
let typeFilter;
let searchInput;
let resetBtn;
let tableContainer;
let summaryEl;

// State
let allRows = [];
let virtualTable = null;
let mapNames = {};
let mapIndexKey = null;

const METRICS = {
  kills: { label: "Most Kills", key: "kills", kind: "number" },
  deaths: { label: "Most Deaths", key: "deaths", kind: "number" },
  damage: { label: "Most Damage", key: "damage", kind: "number" },
  healing: { label: "Most Healing", key: "healing", kind: "number" },
  support: { label: "Most Support", key: "support", kind: "number" },
  match_duration: {
    label: "Longest Match",
    key: "match_duration",
    kind: "duration",
  },
  time_in_queue: {
    label: "Longest Queue",
    key: "time_in_queue",
    kind: "duration",
  },
};

export function initTopLists() {
  metricSelect = document.getElementById("l-metric");
  orderSelect = document.getElementById("l-order");
  typeFilter = document.getElementById("l-type");
  searchInput = document.getElementById("l-search");
  resetBtn = document.getElementById("l-reset");
  tableContainer = document.getElementById("l-table-container");
  summaryEl = document.getElementById("l-summary");

  // Load map names (same source as TF2 module)
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

  // Events
  metricSelect.addEventListener("change", rebuild);
  orderSelect.addEventListener("change", rebuild);
  typeFilter.addEventListener("change", rebuild);
  searchInput.addEventListener("input", debounce(rebuild, 150));
  resetBtn.addEventListener("click", resetTopLists);
}

export function loadTopListRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    allRows = [];
    rebuild();
    return;
  }

  // Normalize numeric fields we care about
  allRows = rows.map((r) => {
    const out = { ...r };
    out.kills = cleanNumeric(r.kills);
    out.deaths = cleanNumeric(r.deaths);
    out.damage = cleanNumeric(r.damage);
    out.healing = cleanNumeric(r.healing);
    out.support = cleanNumeric(r.support);
    out.time_in_queue = cleanNumeric(r.time_in_queue);
    out.match_duration = cleanNumeric(r.match_duration);
    return out;
  });

  // Detect map_index key (case-insensitive)
  mapIndexKey = detectMapIndexKey(allRows[0] || {});

  // Populate type filter
  populateTypeFilter(allRows);

  rebuild();
}

export function resetTopLists() {
  allRows = [];
  mapIndexKey = null;
  if (virtualTable) virtualTable.setData([]);
  if (summaryEl) summaryEl.textContent = "";
  if (searchInput) searchInput.value = "";
  if (metricSelect) metricSelect.value = "kills";
  if (orderSelect) orderSelect.value = "desc";
  if (typeFilter) typeFilter.value = "all";
}

function detectMapIndexKey(row) {
  const keys = Object.keys(row || {});
  const key = keys.find((k) => String(k).toLowerCase() === "map_index");
  return key || null;
}

function populateTypeFilter(data) {
  const types = [
    ...new Set(
      (data || [])
        .map((row) =>
          row.type && String(row.type).trim() ? String(row.type).trim() : "Unknown"
        )
        .filter(Boolean)
    ),
  ].sort();
  if (!typeFilter) return;
  typeFilter.innerHTML =
    '<option value="all">All Types</option>' +
    types.map((t) => `<option value="${t}">${t}</option>`).join("");
  typeFilter.value = "all";
}

function rebuild() {
  const rows = getFilteredRows();
  const metricKey = metricSelect.value;
  const metricMeta = METRICS[metricKey] || METRICS.kills;
  const order = orderSelect.value;

  // Ensure every row has metricValue
  const scored = rows.map((r) => ({
    row: r,
    metricValue: Number(r[metricMeta.key]) || 0,
  }));

  // Sort
  scored.sort((a, b) => {
    if (order === "asc") return a.metricValue - b.metricValue;
    return b.metricValue - a.metricValue;
  });

  // Build table rows
  const tableRows = buildTableRows(scored, metricMeta);
  renderTable(tableRows, metricMeta);
  updateSummary(tableRows.length, metricMeta, order);
}

function getFilteredRows() {
  const selectedType = (typeFilter?.value || "all").toLowerCase();
  const q = (searchInput?.value || "").toLowerCase().trim();

  let rows = allRows.slice();

  if (selectedType !== "all") {
    rows = rows.filter((row) => {
      const rowType = (row.type ? String(row.type) : "Unknown").toLowerCase();
      return rowType === selectedType;
    });
  }

  if (q) {
    rows = rows.filter((row) => {
      const title = (row.match_title || "").toLowerCase();
      const id = (row.match_id || "").toLowerCase();
      const mode = (row.game_mode || "").toLowerCase();
      const dc = (row.datacenter || "").toLowerCase();
      const mapName = resolveMapName(row).toLowerCase();
      return (
        title.includes(q) ||
        id.includes(q) ||
        mode.includes(q) ||
        dc.includes(q) ||
        mapName.includes(q)
      );
    });
  }

  return rows;
}

function resolveMapName(row) {
  if (mapIndexKey && row[mapIndexKey]) {
    const mid = String(row[mapIndexKey]).trim();
    return mapNames[mid]?.name || `Unknown (${mid})`;
  }
  // Fallbacks if CSV contains explicit map name fields
  return row.map_name || row.map || row.mapid || row.mapId || "Unknown";
}

function buildTableRows(scored, metricMeta) {
  const rows = [];
  let rank = 1;
  for (const { row, metricValue } of scored) {
    const kd =
      row.deaths > 0
        ? (row.kills / Math.max(1, row.deaths)).toFixed(2)
        : row.kills > 0
        ? "∞"
        : "0.00";

    rows.push({
      rank,
      metric: formatMetricValue(metricValue, metricMeta.kind),
      match_id: row.match_id || "-",
      match_title: row.match_title || "-",
      type: row.type || "Unknown",
      map_name: resolveMapName(row),
      connection_time: row.connection_time || row.start_time || "",
      kills: row.kills ?? 0,
      deaths: row.deaths ?? 0,
      kd,
      damage: row.damage ?? 0,
      healing: row.healing ?? 0,
      support: row.support ?? 0,
      match_duration: Number(row.match_duration) || 0,
      time_in_queue: Number(row.time_in_queue) || 0,
      game_mode: row.game_mode || "-",
      datacenter: row.datacenter || "-",
      winning_team: row.winning_team || "-",
      result_team: row.result_team || "-",
    });
    rank++;
  }
  return rows;
}

function formatMetricValue(val, kind) {
  if (kind === "duration") return formatDuration(val);
  return Number(val).toLocaleString();
}

function renderTable(rows, metricMeta) {
  const headers = [
    "rank",
    "metric",
    "match_id",
    "match_title",
    "type",
    "map_name",
    "connection_time",
    "kills",
    "deaths",
    "kd",
    "damage",
    "healing",
    "support",
    "match_duration",
    "time_in_queue",
    "game_mode",
    "datacenter",
    "winning_team",
    "result_team",
  ];

  const headerLabels = {
    rank: "#",
    metric: metricMeta?.label || "Metric",
    match_id: "Match ID",
    match_title: "Title",
    type: "Type",
    map_name: "Map",
    connection_time: "Played At",
    kills: "Kills",
    deaths: "Deaths",
    kd: "K/D",
    damage: "Damage",
    healing: "Healing",
    support: "Support",
    match_duration: "Match Duration",
    time_in_queue: "Queue Time",
    game_mode: "Game Mode",
    datacenter: "Datacenter",
    winning_team: "Winning Team",
    result_team: "Your Team",
  };

  // Human readable headers
  const displayHeaders = headers.map((h) => headerLabels[h] || h);

  const formatters = {
    match_duration: (v) => formatDuration(Number(v) || 0),
    time_in_queue: (v) => formatDuration(Number(v) || 0),
  };

  // Recreate virtual table to update header labels cleanly
  if (virtualTable) {
    try {
      virtualTable.destroy();
    } catch {
      // ignore
    }
    // container should be empty after destroy, but ensure it
    if (tableContainer) tableContainer.innerHTML = "";
    virtualTable = null;
  }

  virtualTable = new VirtualTable(tableContainer, {
    headers: displayHeaders,
    rowKeys: headers,
    formatters,
  });

  virtualTable.setData(rows);
}

function updateSummary(count, metricMeta, order) {
  const dir = order === "asc" ? "ascending" : "descending";
  if (summaryEl) {
    summaryEl.textContent = `${count.toLocaleString()} matches · ${
      metricMeta?.label || "Metric"
    } (${dir})`;
  }
}