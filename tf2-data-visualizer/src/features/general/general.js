import {
  formatDuration,
  formatMatchTime,
  cleanNumeric,
  isTruthy,
  debounce,
  nextFrame,
  idle,
} from "../../shared/core/utils.js";
import { VirtualTable } from "../../shared/ui/virtual-table.js";
import {
  CHART_DEFAULT_OPTIONS,
  COLORS,
  FONTS,
} from "../../shared/core/config.js";

// Module-scoped state and refs
let keyStatsContainer;
let sortSelect;
let typeFilter;
let matchSearchInput;
let clearSearchBtn;
let resetFiltersBtn;
let dataTableContainer;
let tableSummary;

let charts = {};
let allMatchData = [];
let virtualTable = null;

// Use config for chart options
const chartDefaultOptions = CHART_DEFAULT_OPTIONS;

export function initGCPD() {
  // DOM (no upload; handled globally)
  keyStatsContainer = document.getElementById("g-key-stats");
  sortSelect = document.getElementById("g-sort-select");
  typeFilter = document.getElementById("g-type-filter");
  matchSearchInput = document.getElementById("g-match-search");
  clearSearchBtn = document.getElementById("g-clear-search");
  resetFiltersBtn = document.getElementById("g-reset-filters");
  dataTableContainer = document.getElementById("g-data-table-container");
  tableSummary = document.getElementById("g-table-summary");

  // Listeners
  sortSelect.addEventListener("change", () => renderDashboard());
  matchSearchInput.addEventListener(
    "input",
    debounce(() => renderDashboard(), 150)
  );
  typeFilter.addEventListener("change", () => renderDashboard());

  clearSearchBtn.addEventListener("click", () => {
    matchSearchInput.value = "";
    renderDashboard();
  });

  resetFiltersBtn.addEventListener("click", () => {
    sortSelect.value = "all";
    typeFilter.value = "all";
    matchSearchInput.value = "";
    renderDashboard();
  });

  // Delegated click for "View match" chips
  keyStatsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-focus-match");
    if (!btn) return;
    const title = btn.getAttribute("data-focus-match");
    if (!title) return;
    const options = Array.from(sortSelect.options).map((o) => o.value);
    if (options.includes(title)) {
      sortSelect.value = title;
      renderDashboard();
      sortSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

// Public API for global controller
export function loadGCPDRows(rows) {
  allMatchData = (rows || []).map((row) => {
    const newRow = {};
    for (const key in row) {
      if (
        [
          "kills",
          "deaths",
          "healing",
          "damage",
          "time_in_queue",
          "match_duration",
        ].includes(key)
      ) {
        newRow[key] = cleanNumeric(row[key]);
      } else {
        newRow[key] = row[key];
      }
    }
    return newRow;
  });

  populateSortFilter(allMatchData);
  populateTypeFilter(allMatchData);
  if (matchSearchInput) matchSearchInput.value = "";

  // Render when visible to avoid sizing issues
  setTimeout(() => {
    if (typeof gsap !== "undefined") {
      gsap.from(".chart-container", {
        duration: 0.6,
        scale: 0.98,
        opacity: 0,
        stagger: 0.12,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
    }
    renderDashboard();
  }, 0);
}

export function resetGCPD() {
  allMatchData = [];
  try {
    for (const k in charts) {
      charts[k]?.destroy?.();
      delete charts[k];
    }
  } catch {}
  if (virtualTable) virtualTable.setData([]);
  if (keyStatsContainer) keyStatsContainer.innerHTML = "";
  if (sortSelect)
    sortSelect.innerHTML = '<option value="all">All Matches</option>';
  if (typeFilter) typeFilter.innerHTML = '<option value="all">All Types</option>';
  if (matchSearchInput) matchSearchInput.value = "";
  if (tableSummary) tableSummary.textContent = "";
}

// Helpers

function populateSortFilter(data) {
  const matchTitles = [
    ...new Set(
      data.map((row) => row.match_title || row.match_id).filter(Boolean)
    ),
  ].sort();
  sortSelect.innerHTML =
    '<option value="all">All Matches</option>' +
    matchTitles.map((t) => `<option value="${t}">${t}</option>`).join("");
  sortSelect.value = "all";
}

function populateTypeFilter(data) {
  const types = [
    ...new Set(
      data
        .map((row) =>
          row.type && String(row.type).trim() ? String(row.type).trim() : "Unknown"
        )
        .filter(Boolean)
    ),
  ].sort();
  typeFilter.innerHTML =
    '<option value="all">All Types</option>' +
    types.map((t) => `<option value="${t}">${t}</option>`).join("");
  typeFilter.value = "all";
}

function getFilteredData() {
  const selectedTitle = sortSelect.value;
  const searchTerm = (matchSearchInput.value || "").toLowerCase().trim();
  const selectedType = (typeFilter.value || "all").toLowerCase();

  let filtered = allMatchData;

  if (selectedTitle !== "all") {
    filtered = filtered.filter(
      (row) => (row.match_title || row.match_id) === selectedTitle
    );
  }

  if (selectedType !== "all") {
    filtered = filtered.filter((row) => {
      const rowType = (row.type ? String(row.type) : "Unknown").toLowerCase();
      return rowType === selectedType;
    });
  }

  if (searchTerm) {
    filtered = filtered.filter(
      (row) =>
        (row.match_title &&
          row.match_title.toLowerCase().includes(searchTerm)) ||
        (row.match_id && row.match_id.toLowerCase().includes(searchTerm)) ||
        (row.game_mode && row.game_mode.toLowerCase().includes(searchTerm)) ||
        (row.datacenter &&
          row.datacenter.toLowerCase().includes(searchTerm)) ||
        (row.type && String(row.type).toLowerCase().includes(searchTerm))
    );
  }

  return filtered;
}

function calculateStats(data) {
  if (!Array.isArray(data) || data.length === 0) return {};

  const kills = data.map((r) => r.kills || 0);
  const deaths = data.map((r) => r.deaths || 0);
  const healing = data.map((r) => r.healing || 0);
  const damages = data.map((r) => cleanNumeric(r.damage));

  const queueData = data
    .filter((r) => r.time_in_queue > 0 && r.connection_time)
    .map((r) => ({
      time: r.time_in_queue,
      title: r.match_title || r.match_id,
      eventTime: r.connection_time,
    }));

  const matchDurationData = data
    .filter((r) => r.match_duration > 0 && r.connection_time)
    .map((r) => ({
      time: r.match_duration,
      title: r.match_title || r.match_id,
      eventTime: r.connection_time,
    }));

  const totalMatches = data.length;
  const totalKills = kills.reduce((a, b) => a + b, 0);
  const totalDeaths = deaths.reduce((a, b) => a + b, 0);
  const totalHealing = healing.reduce((a, b) => a + b, 0);
  const totalDamage = damages.reduce((a, b) => a + b, 0);

  const outcomes = data.reduce(
    (acc, r) => {
      const playerTeam = (r.result_team || "").toLowerCase();
      const winningTeam = (r.winning_team || "").toLowerCase();
      if (playerTeam && winningTeam && playerTeam === winningTeam) acc.wins++;
      else if (!winningTeam || winningTeam === "none" || winningTeam === "null")
        acc.ties++;
      else acc.losses++;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0 }
  );

  const totalQueueTimeSeconds = queueData.reduce((a, b) => a + b.time, 0);
  const totalMatchTimeSeconds = matchDurationData.reduce(
    (a, b) => a + b.time,
    0
  );

  const longestQueueEntry = queueData.length
    ? queueData.reduce((m, c) => (c.time > m.time ? c : m), queueData[0])
    : null;
  const shortestQueueEntry = queueData.length
    ? queueData.reduce((m, c) => (c.time < m.time ? c : m), queueData[0])
    : null;

  const longestMatchEntry = matchDurationData.length
    ? matchDurationData.reduce((m, c) => (c.time > m.time ? c : m), matchDurationData[0])
    : null;
  const shortestMatchEntry = matchDurationData.length
    ? matchDurationData.reduce((m, c) => (c.time < m.time ? c : m), matchDurationData[0])
    : null;

  const matchWithMostKills = data.length
    ? data.reduce((m, c) => ((c.kills || 0) > (m.kills || 0) ? c : m), data[0])
    : null;
  const matchWithMostDeaths = data.length
    ? data.reduce((m, c) => ((c.deaths || 0) > (m.deaths || 0) ? c : m), data[0])
    : null;
  const matchWithMostHealing = data.length
    ? data.reduce((m, c) => ((c.healing || 0) > (m.healing || 0) ? c : m), data[0])
    : null;

  return {
    totalMatches,
    avgKills: (totalKills / totalMatches).toFixed(2),
    avgDeaths: (totalDeaths / totalMatches).toFixed(2),
    avgHealing: (totalHealing / totalMatches).toFixed(2),
    avgDamage: (totalDamage / totalMatches).toFixed(2),
    kdRatio:
      totalDeaths > 0
        ? (totalKills / Math.max(1, totalDeaths)).toFixed(2)
        : totalKills > 0
        ? "∞"
        : "0.00",
    wins: outcomes.wins,
    losses: outcomes.losses,
    ties: outcomes.ties,
    winRate:
      totalMatches > 0
        ? ((outcomes.wins / totalMatches) * 100).toFixed(1) + "%"
        : "0%",

    avgQueueTime: queueData.length
      ? formatDuration(totalQueueTimeSeconds / queueData.length)
      : "N/A",
    longestQueueTime: longestQueueEntry
      ? formatDuration(longestQueueEntry.time)
      : "N/A",
    longestQueueTimeDetails: longestQueueEntry
      ? {
          title: longestQueueEntry.title,
          time: formatMatchTime(longestQueueEntry.eventTime),
        }
      : null,
    shortestQueueTime: shortestQueueEntry
      ? formatDuration(shortestQueueEntry.time)
      : "N/A",
    shortestQueueTimeDetails: shortestQueueEntry
      ? {
          title: shortestQueueEntry.title,
          time: formatMatchTime(shortestQueueEntry.eventTime),
        }
      : null,
    totalQueueTime: formatDuration(totalQueueTimeSeconds),

    mostKills: matchWithMostKills ? matchWithMostKills.kills : 0,
    mostKillsDetails: matchWithMostKills
      ? {
          title: matchWithMostKills.match_title || matchWithMostKills.match_id,
          time: formatMatchTime(matchWithMostKills.connection_time),
        }
      : null,
    mostDeaths: matchWithMostDeaths ? matchWithMostDeaths.deaths : 0,
    mostDeathsDetails: matchWithMostDeaths
      ? {
          title:
            matchWithMostDeaths.match_title || matchWithMostDeaths.match_id,
          time: formatMatchTime(matchWithMostDeaths.connection_time),
        }
      : null,
    mostHealing: matchWithMostHealing ? matchWithMostHealing.healing : 0,
    mostHealingDetails: matchWithMostHealing
      ? {
          title:
            matchWithMostHealing.match_title || matchWithMostHealing.match_id,
          time: formatMatchTime(matchWithMostHealing.connection_time),
        }
      : null,

    matchesJoinedMid: data.filter((r) => isTruthy(r.joined_after_match_start))
      .length,

    avgMatchTime: matchDurationData.length
      ? formatDuration(totalMatchTimeSeconds / matchDurationData.length)
      : "N/A",
    longestMatchTime: longestMatchEntry
      ? formatDuration(longestMatchEntry.time)
      : "N/A",
    longestMatchTimeDetails: longestMatchEntry
      ? {
          title: longestMatchEntry.title,
          time: formatMatchTime(longestMatchEntry.eventTime),
        }
      : null,
    shortestMatchTime: shortestMatchEntry
      ? formatDuration(shortestMatchEntry.time)
      : "N/A",
    shortestMatchTimeDetails: shortestMatchEntry
      ? {
          title: shortestMatchEntry.title,
          time: formatMatchTime(shortestMatchEntry.eventTime),
        }
      : null,
    totalMatchTime: formatDuration(totalMatchTimeSeconds),
  };
}

function animateKeyStats() {
  if (typeof gsap === "undefined") return;
  const sel = "#g-key-stats .stat-card";
  gsap.killTweensOf(sel);
  gsap.set(sel, { opacity: 0, y: 20 });
  requestAnimationFrame(() => {
    gsap.to(sel, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.05,
      ease: "power2.out",
      clearProps: "opacity,transform",
    });
  });
}

function renderKeyStats(stats) {
  keyStatsContainer.innerHTML = "";
  const categoryMeta = {
    overall: {
      title: "Overall Summary",
      iconColor: "#b44c33", // rust
      badgeBg: "rgba(180, 76, 51, 0.15)",
      borderColor: "#b44c33",
    },
    combat: {
      title: "Combat",
      iconColor: "#8a3a28", // rust-dark
      badgeBg: "rgba(138, 58, 40, 0.15)",
      borderColor: "#8a3a28",
    },
    queue: {
      title: "Queue Time",
      iconColor: "#c9a227", // brass
      badgeBg: "rgba(201, 162, 39, 0.15)",
      borderColor: "#c9a227",
    },
    match: {
      title: "Match Time",
      iconColor: "#5885a2", // blu
      badgeBg: "rgba(88, 133, 162, 0.15)",
      borderColor: "#5885a2",
    },
  };

  const statItems = [
    {
      icon: "ri-bar-chart-box-fill",
      label: "Total Matches",
      value: stats.totalMatches,
      category: "overall",
    },
    {
      icon: "ri-login-box-fill",
      label: "Joined in Progress",
      value: `${stats.matchesJoinedMid} matches`,
      category: "overall",
    },
    {
      icon: "ri-trophy-fill",
      label: "Win Rate",
      value: stats.winRate,
      category: "overall",
    },
    { icon: "ri-thumb-up-fill", label: "Wins", value: stats.wins, category: "overall" },
    {
      icon: "ri-thumb-down-fill",
      label: "Losses",
      value: stats.losses,
      category: "overall",
    },
    { icon: "ri-subtract-line", label: "Stalemates", value: stats.ties, category: "overall" },

    { icon: "ri-sword-fill", label: "K/D Ratio", value: stats.kdRatio, category: "combat" },
    {
      icon: "ri-crosshair-2-fill",
      label: "Avg. Kills",
      value: stats.avgKills,
      category: "combat",
    },
    {
      icon: "ri-skull-fill",
      label: "Avg. Deaths",
      value: stats.avgDeaths,
      category: "combat",
    },
    {
      icon: "ri-fire-fill",
      label: "Avg. Damage",
      value: stats.avgDamage,
      category: "combat",
    },
    {
      icon: "ri-heart-pulse-fill",
      label: "Avg. Healing",
      value: stats.avgHealing,
      category: "combat",
    },
    {
      icon: "ri-arrow-up-double-fill",
      label: "Most Kills",
      value: stats.mostKills,
      details: stats.mostKillsDetails,
      category: "combat",
    },
    {
      icon: "ri-skull-2-fill",
      label: "Most Deaths",
      value: stats.mostDeaths,
      details: stats.mostDeathsDetails,
      category: "combat",
    },
    {
      icon: "ri-first-aid-kit-fill",
      label: "Most Healing",
      value: stats.mostHealing,
      details: stats.mostHealingDetails,
      category: "combat",
    },

    {
      icon: "ri-timer-fill",
      label: "Avg. Queue Time",
      value: stats.avgQueueTime,
      category: "queue",
    },
    {
      icon: "ri-time-fill",
      label: "Total Queue Time",
      value: stats.totalQueueTime,
      category: "queue",
    },
    {
      icon: "ri-hourglass-fill",
      label: "Longest Queue",
      value: stats.longestQueueTime,
      details: stats.longestQueueTimeDetails,
      category: "queue",
    },
    {
      icon: "ri-hourglass-2-fill",
      label: "Shortest Queue",
      value: stats.shortestQueueTime,
      details: stats.shortestQueueTimeDetails,
      category: "queue",
    },

    {
      icon: "ri-timer-2-fill",
      label: "Avg. Match Time",
      value: stats.avgMatchTime,
      category: "match",
    },
    {
      icon: "ri-gamepad-fill",
      label: "Total Match Time",
      value: stats.totalMatchTime,
      category: "match",
    },
    {
      icon: "ri-timer-flash-fill",
      label: "Longest Match",
      value: stats.longestMatchTime,
      details: stats.longestMatchTimeDetails,
      category: "match",
    },
    {
      icon: "ri-flashlight-fill",
      label: "Shortest Match",
      value: stats.shortestMatchTime,
      details: stats.shortestMatchTimeDetails,
      category: "match",
    },
  ].filter(
    (i) => i.value !== undefined && i.value !== null && i.value !== "N/A"
  );

  const categories = ["overall", "combat", "queue", "match"];
  categories.forEach((catKey) => {
    const groupItems = statItems.filter((i) => i.category === catKey);
    if (!groupItems.length) return;
    const meta = categoryMeta[catKey];

    const group = document.createElement("div");
    group.style.cssText = "grid-column: 1 / -1; margin-bottom: 1.5rem;";
    group.innerHTML = `
      <div style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span style="color: ${meta.iconColor}; font-size: 0.75rem;">◆</span>
        <h3 style="font-family: 'TF2 Build', Impact, sans-serif; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 0.02em; color: #2a2118;">${meta.title}</h3>
      </div>
      <div class="stat-grid"></div>
    `;
    const grid = group.querySelector(".stat-grid");

    groupItems.forEach((item) => {
      const detailHtml = item.details
        ? `<button
            class="match-chip js-focus-match"
            data-focus-match="${item.details.title}"
            title="View this match in the table"
          >
            <i class="ri-eye-line"></i>
            <span>View</span>
            <span class="match-chip-time">• ${item.details.time}</span>
          </button>`
        : "";

      const card = document.createElement("div");
      card.className = "stat-card";
      card.style.cssText = `
        background: #e8d4a8;
        border: 2px solid #2a2118;
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        position: relative;
        box-shadow: 2px 2px 0 rgba(42, 33, 24, 0.3);
        border-left: 4px solid ${meta.borderColor};
      `;
      card.innerHTML = `
        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #e5c76b, #c9a227); border: 2px solid #9a7a1d; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2); flex-shrink: 0;">
          <i class="${item.icon}" style="font-size: 1.25rem; color: #2a2118;"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <p style="font-family: 'TF2 Build', Impact, sans-serif; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; color: #5a6673;">${item.label}</p>
          <p style="font-family: 'OCR-A', Consolas, monospace; font-size: 1.25rem; font-weight: 700; color: #2a2118; word-break: break-word;">${item.value}</p>
          ${detailHtml}
        </div>
      `;
      grid.appendChild(card);
    });

    keyStatsContainer.appendChild(group);
  });

  animateKeyStats();
}

function destroyCharts() {
  for (const k in charts) {
    try {
      charts[k]?.destroy?.();
    } catch (e) {
      console.warn("Chart destroy error", k, e);
    }
    delete charts[k];
  }
}

async function renderDashboard() {
  const data = getFilteredData();
  const stats = calculateStats(data);

  // Key stats first
  renderKeyStats(stats);

  // Early exit empty
  if (!data.length) {
    destroyCharts();
    if (virtualTable) {
      virtualTable.setData([]);
    } else {
      dataTableContainer.innerHTML =
        '<div class="table-wrapper"><table><thead></thead><tbody></tbody></table></div>';
    }
    tableSummary.textContent = "No rows";
    return;
  }

  // Defer charts for smoother UI
  destroyCharts();
  await nextFrame();

  createPerformanceChart(data);
  await idle(100);

  createWinLossChart(data);
  await idle(100);

  createGameModeChart(data);
  await idle(100);

  createTimelineChart(data);
  await nextFrame();

  renderDataTable(data);
}

function renderDataTable(data) {
  const headers = Array.from(new Set(data.flatMap(Object.keys)));
  const preferredOrder = [
    "match_id",
    "match_title",
    "connection_time",
    "game_mode",
    "type",
    "datacenter",
    "kills",
    "deaths",
    "damage",
    "healing",
    "support",
    "match_duration",
    "time_in_queue",
    "winning_team",
    "result_team",
  ];
  const sortedHeaders = [
    ...preferredOrder.filter((h) => headers.includes(h)),
    ...headers.filter((h) => !preferredOrder.includes(h) && h !== "type").sort(),
  ];

  if (!virtualTable) {
    virtualTable = new VirtualTable(dataTableContainer, {
      headers: sortedHeaders,
      rowKeys: sortedHeaders,
    });
  }
  virtualTable.setData(data);
  tableSummary.textContent = `${data.length.toLocaleString()} rows`;
}

function createPerformanceChart(data) {
  const ctx = document.getElementById("g-performance-chart").getContext("2d");
  // Limit to last 200 for performance
  const trimmed = data.slice(-200);
  const labels = trimmed.map(
    (_, i) => `#${data.length - trimmed.length + i + 1}`
  );
  charts.performance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Kills",
          data: trimmed.map((r) => r.kills || 0),
          backgroundColor: "#b44c33", // rust
          yAxisID: "y", // left axis
        },
        {
          label: "Deaths",
          data: trimmed.map((r) => r.deaths || 0),
          backgroundColor: "#5a6673", // steel
          yAxisID: "y", // left axis
        },
        {
          label: "Damage",
          data: trimmed.map((r) => r.damage || 0),
          backgroundColor: "#c9a227", // brass
          yAxisID: "y1", // right axis
        },
        {
          label: "Healing",
          data: trimmed.map((r) => r.healing || 0),
          backgroundColor: "#5885a2", // blu
          yAxisID: "y1", // right axis
        },
      ],
    },
    options: {
      ...chartDefaultOptions,
      scales: {
        x: {
          ticks: { color: "#4a3d30", font: { family: "'OCR-A', Consolas, monospace" } },
          grid: { color: "#e8d4a8" },
        },
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Kills / Deaths",
            color: "#b44c33",
            font: { family: "'TF2 Secondary', Arial, sans-serif", size: 11 },
          },
          ticks: { color: "#4a3d30", precision: 0, font: { family: "'OCR-A', Consolas, monospace" } },
          grid: { color: "#e8d4a8" },
        },
        y1: {
          type: "linear",
          position: "right",
          title: {
            display: true,
            text: "Damage / Healing",
            color: "#c9a227",
            font: { family: "'TF2 Secondary', Arial, sans-serif", size: 11 },
          },
          ticks: { color: "#4a3d30", precision: 0, font: { family: "'OCR-A', Consolas, monospace" } },
          grid: { drawOnChartArea: false }, // don't overlap with left axis grid
        },
      },
    },
  });
}

function createWinLossChart(data) {
  const ctx = document.getElementById("g-win-loss-chart").getContext("2d");
  const outcomes = data.reduce(
    (acc, row) => {
      const playerTeam = (row.result_team || "").toLowerCase();
      const winningTeam = (row.winning_team || "").toLowerCase();
      if (playerTeam && winningTeam && playerTeam === winningTeam) {
        acc["Wins"] = (acc["Wins"] || 0) + 1;
      } else if (!winningTeam || winningTeam === "none" || winningTeam === "null") {
        acc["Stalemate / Tie"] = (acc["Stalemate / Tie"] || 0) + 1;
      } else {
        acc["Losses"] = (acc["Losses"] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  charts.winLoss = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(outcomes),
      datasets: [
        {
          data: Object.values(outcomes),
          backgroundColor: ["#5885a2", "#5a6673", "#b44c33"], // blu, steel, rust
          borderColor: "#2a2118",
        },
      ],
    },
    options: { ...chartDefaultOptions, scales: {} },
  });
}

function createGameModeChart(data) {
  const ctx = document.getElementById("g-game-mode-chart").getContext("2d");
  const types = data.reduce((acc, row) => {
    const type = row.type || "Unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  charts.gameModes = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(types),
      datasets: [
        {
          data: Object.values(types),
          backgroundColor: [
            "#b44c33", // rust
            "#c9a227", // brass
            "#5885a2", // blu
            "#5a6673", // steel
            "#8a3a28", // rust-dark
            "#9a7a1d", // brass-dark
            "#3d6178", // blu-dark
            "#d4694f", // rust-light
            "#e5c76b", // brass-light
          ],
          borderColor: "#2a2118",
        },
      ],
    },
    options: { ...chartDefaultOptions, scales: {} },
  });
}

function createTimelineChart(data) {
  const ctx = document.getElementById("g-timeline-chart").getContext("2d");
  const sortedData = data
    .filter((r) => r.connection_time)
    .sort((a, b) => new Date(a.connection_time) - new Date(b.connection_time))
    .slice(-200);

  charts.timeline = new Chart(ctx, {
    type: "line",
    data: {
      labels: sortedData.map((r) =>
        new Date(r.connection_time).toLocaleString()
      ),
      datasets: [
        {
          label: "Kills",
          data: sortedData.map((r) => r.kills || 0),
          borderColor: "#b44c33", // rust
          backgroundColor: "#b44c3320",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Deaths",
          data: sortedData.map((r) => r.deaths || 0),
          borderColor: "#5885a2", // blu
          backgroundColor: "#5885a220",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: chartDefaultOptions,
  });
}
