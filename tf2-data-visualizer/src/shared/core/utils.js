export const formatDuration = (seconds) => {
  if (isNaN(seconds) || seconds == null) return "N/A";
  seconds = Number(seconds);
  if (seconds < 0) return "N/A";
  if (seconds === 0) return "0 secs";

  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(d + (d === 1 ? " day" : " days"));
  if (h > 0) parts.push(h + (h === 1 ? " hr" : " hrs"));
  if (m > 0) parts.push(m + (m === 1 ? " min" : " mins"));
  if (s > 0) parts.push(s + (s === 1 ? " sec" : " secs"));
  return parts.join(", ");
};

export const formatMatchTime = (isoString) => {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return "N/A";
  }
};

export const cleanNumeric = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export const isTruthy = (v) => {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on";
};

export const debounce = (fn, wait = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), wait);
  };
};

export const nextFrame = () =>
  new Promise((r) => requestAnimationFrame(() => r()));

export const idle = (timeout = 300) =>
  new Promise((r) =>
    (window.requestIdleCallback
      ? requestIdleCallback
      : (cb) => setTimeout(cb, 0))(() => r(), { timeout })
  );

export const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");