import {
  formatDuration,
  formatMatchTime,
  cleanNumeric,
  isTruthy,
  debounce,
  nextFrame,
  idle,
} from "./utils.js";
import { VirtualTable } from "./virtual-table.js";

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

const chartDefaultOptions = {
  maintainAspectRatio: false,
  animation: { duration: 450, easing: "easeOutCubic" },
  plugins: {
    legend: { labels: { color: "#d1d5db" } },
  },
  scales: {
    x: {
      ticks: { color: "#9ca3af" },
      grid: { color: "#4b5563" },
    },
    y: {
      ticks: { color: "#9ca3af", precision: 0 },
      grid: { color: "#4b5563" },
    },
  },
};

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
      iconColor: "text-purple-300",
      badgeBg: "bg-purple-500/15",
      ring: "ring-purple-500/20",
      gradient: "from-purple-500/10 via-gray-800 to-gray-800",
    },
    combat: {
      title: "Combat",
      iconColor: "text-rose-300",
      badgeBg: "bg-rose-500/15",
      ring: "ring-rose-500/20",
      gradient: "from-rose-500/10 via-gray-800 to-gray-800",
    },
    queue: {
      title: "Queue Time",
      iconColor: "text-amber-300",
      badgeBg: "bg-amber-500/15",
      ring: "ring-amber-500/20",
      gradient: "from-amber-500/10 via-gray-800 to-gray-800",
    },
    match: {
      title: "Match Time",
      iconColor: "text-emerald-300",
      badgeBg: "bg-emerald-500/15",
      ring: "ring-emerald-500/20",
      gradient: "from-emerald-500/10 via-gray-800 to-gray-800",
    },
  };

  const statItems = [
    {
      icon: "format_list_numbered",
      label: "Total Matches",
      value: stats.totalMatches,
      category: "overall",
    },
    {
      icon: "login",
      label: "Joined in Progress",
      value: `${stats.matchesJoinedMid} matches`,
      category: "overall",
    },
    {
      icon: "military_tech",
      label: "Win Rate",
      value: stats.winRate,
      category: "overall",
    },
    { icon: "thumb_up", label: "Wins", value: stats.wins, category: "overall" },
    {
      icon: "thumb_down",
      label: "Losses",
      value: stats.losses,
      category: "overall",
    },
    { icon: "remove", label: "Stalemates", value: stats.ties, category: "overall" },

    { icon: "group", label: "K/D Ratio", value: stats.kdRatio, category: "combat" },
    {
      icon: "military_tech",
      label: "Avg. Kills",
      value: stats.avgKills,
      category: "combat",
    },
    {
      icon: "dangerous",
      label: "Avg. Deaths",
      value: stats.avgDeaths,
      category: "combat",
    },
    {
      icon: "whatshot",
      label: "Avg. Damage",
      value: stats.avgDamage,
      category: "combat",
    },
    {
      icon: "healing",
      label: "Avg. Healing",
      value: stats.avgHealing,
      category: "combat",
    },
    {
      icon: "trending_up",
      label: "Most Kills",
      value: stats.mostKills,
      details: stats.mostKillsDetails,
      category: "combat",
    },
    {
      icon: "sick",
      label: "Most Deaths",
      value: stats.mostDeaths,
      details: stats.mostDeathsDetails,
      category: "combat",
    },
    {
      icon: "health_and_safety",
      label: "Most Healing",
      value: stats.mostHealing,
      details: stats.mostHealingDetails,
      category: "combat",
    },

    {
      icon: "timer",
      label: "Avg. Queue Time",
      value: stats.avgQueueTime,
      category: "queue",
    },
    {
      icon: "history",
      label: "Total Queue Time",
      value: stats.totalQueueTime,
      category: "queue",
    },
    {
      icon: "schedule",
      label: "Longest Queue",
      value: stats.longestQueueTime,
      details: stats.longestQueueTimeDetails,
      category: "queue",
    },
    {
      icon: "alarm_on",
      label: "Shortest Queue",
      value: stats.shortestQueueTime,
      details: stats.shortestQueueTimeDetails,
      category: "queue",
    },

    {
      icon: "hourglass_empty",
      label: "Avg. Match Time",
      value: stats.avgMatchTime,
      category: "match",
    },
    {
      icon: "sports_esports",
      label: "Total Match Time",
      value: stats.totalMatchTime,
      category: "match",
    },
    {
      icon: "hourglass_full",
      label: "Longest Match",
      value: stats.longestMatchTime,
      details: stats.longestMatchTimeDetails,
      category: "match",
    },
    {
      icon: "hourglass_bottom",
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
    group.className = "col-span-full";
    group.innerHTML = `
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-white">${meta.title}</h3>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"></div>
    `;
    const grid = group.querySelector(".grid");

    groupItems.forEach((item) => {
      const detailHtml = item.details
        ? `<button
            class="js-focus-match mt-2 inline-flex items-center gap-1 rounded-md ${meta.badgeBg} px-2 py-1 text-xs text-gray-300 hover:underline"
            data-focus-match="${item.details.title}"
            title="View this match"
          >
            <i class="material-icons text-[1rem] ${meta.iconColor}">visibility</i>
            View match • ${item.details.time}
          </button>`
        : "";

      const card = document.createElement("div");
      card.className =
        `stat-card relative overflow-hidden rounded-xl bg-gradient-to-br ${meta.gradient} ` +
        `ring-1 ring-inset ${meta.ring} p-4 transition-all ` +
        `hover:shadow-lg hover:shadow-white/5`;
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full ${meta.badgeBg}">
              <i class="material-icons ${meta.iconColor}">${item.icon}</i>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-gray-400">${item.label}</p>
              <p class="text-2xl font-bold leading-tight">${item.value}</p>
              ${detailHtml}
            </div>
          </div>
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
          backgroundColor: "#2dd4bf",
        },
        {
          label: "Deaths",
          data: trimmed.map((r) => r.deaths || 0),
          backgroundColor: "#f87171",
        },
        {
          label: "Damage",
          data: trimmed.map((r) => r.damage || 0),
          backgroundColor: "#facc15",
        },
        {
          label: "Healing",
          data: trimmed.map((r) => r.healing || 0),
          backgroundColor: "#4ade80",
        },
      ],
    },
    options: chartDefaultOptions,
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
          backgroundColor: ["#2dd4bf", "#6b7280", "#f87171"],
          borderColor: "#1f2937",
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
            "#38bdf8",
            "#818cf8",
            "#c084fc",
            "#f472b6",
            "#fb923c",
            "#a3e635",
            "#fdba74",
            "#93c5fd",
            "#c4b5fd",
          ],
          borderColor: "#1f2937",
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
          borderColor: "#2dd4bf",
          backgroundColor: "#2dd4bf20",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Deaths",
          data: sortedData.map((r) => r.deaths || 0),
          borderColor: "#f87171",
          backgroundColor: "#f8717120",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: chartDefaultOptions,
  });
}