/**
 * Shared Configuration
 * Constants used across the TF2 Data Visualizer
 */

// ═══════════════════════════════════════════════════════════════════════════
// THEME COLORS (match styles/base.css)
// ═══════════════════════════════════════════════════════════════════════════

export const COLORS = {
  // Core palette
  cream: "#f5e6c8",
  creamDark: "#e8d4a8",
  parchment: "#faf3e3",
  rust: "#b44c33",
  rustDark: "#8a3a28",
  rustLight: "#d4694f",
  brass: "#c9a227",
  brassLight: "#e5c76b",
  brassDark: "#9a7a1d",
  ink: "#2a2118",
  inkLight: "#4a3d30",
  steel: "#5a6673",
  steelDark: "#3d454f",
  steelLight: "#7a8693",
  blu: "#5885a2",
  bluDark: "#3d6178",
};

// Chart-specific colors
export const CHART_COLORS = {
  primary: COLORS.rust,
  secondary: COLORS.brass,
  tertiary: COLORS.steel,
  quaternary: COLORS.blu,
  win: COLORS.brassDark,
  loss: COLORS.rust,
  tie: COLORS.steel,
  grid: COLORS.creamDark,
  text: COLORS.inkLight,
  label: COLORS.ink,
};

// ═══════════════════════════════════════════════════════════════════════════
// FONTS
// ═══════════════════════════════════════════════════════════════════════════

export const FONTS = {
  display: "'TF2 Build', 'Impact', sans-serif",
  body: "'TF2 Secondary', 'Arial', sans-serif",
  data: "'OCR-A', 'Consolas', monospace",
};

// ═══════════════════════════════════════════════════════════════════════════
// CHART.JS DEFAULT OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const CHART_DEFAULT_OPTIONS = {
  maintainAspectRatio: false,
  animation: { duration: 450, easing: "easeOutCubic" },
  plugins: {
    legend: {
      labels: {
        color: COLORS.ink,
        font: { family: FONTS.body }
      }
    },
  },
  scales: {
    x: {
      ticks: { color: COLORS.inkLight, font: { family: FONTS.data } },
      grid: { color: COLORS.creamDark },
    },
    y: {
      ticks: { color: COLORS.inkLight, precision: 0, font: { family: FONTS.data } },
      grid: { color: COLORS.creamDark },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION DURATIONS (in seconds, for GSAP)
// ═══════════════════════════════════════════════════════════════════════════

export const ANIMATION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  stagger: {
    fast: 0.025,
    normal: 0.04,
    slow: 0.08
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MAP DATA CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export const MAP_CATEGORIES = {
  official: "Official",
  community: "Community",
  unknown: "Unknown"
};
