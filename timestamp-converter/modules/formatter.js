// modules/formatter.js

const DEBUG = false; // Keep consistent with main script if needed
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function formatDateTime(date) {
  if (!date || isNaN(date.getTime())) {
    debugLog("Invalid date passed to formatDateTime:", date);
    // Return structure expected by the main script
    return {
        unixTimestamp: { display: "Error", copy: "Error" },
        shortTime: { display: "Error", copy: "Error" },
        longTime: { display: "Error", copy: "Error" },
        shortDate: { display: "Error", copy: "Error" },
        longDate: { display: "Error", copy: "Error" },
        longDateShortTime: { display: "Error", copy: "Error" },
        longDateDayShortTime: { display: "Error", copy: "Error" },
        relative: { display: "Error", copy: "Error" }
    };
  }

  const locale = undefined; // Use user's default locale
  const timestamp = Math.floor(date.getTime() / 1000);

  if (isNaN(timestamp)) {
    debugLog("Calculated timestamp is NaN in formatDateTime");
     return {
        unixTimestamp: { display: "Error", copy: "Error" },
        shortTime: { display: "Error", copy: "Error" },
        longTime: { display: "Error", copy: "Error" },
        shortDate: { display: "Error", copy: "Error" },
        longDate: { display: "Error", copy: "Error" },
        longDateShortTime: { display: "Error", copy: "Error" },
        longDateDayShortTime: { display: "Error", copy: "Error" },
        relative: { display: "Error", copy: "Error" }
    };
  }

  const previewOptions = {
    t: { timeStyle: "short" },
    T: { timeStyle: "medium" },
    d: { dateStyle: "short" },
    D: { dateStyle: "long" },
    f: { dateStyle: "long", timeStyle: "short" },
    F: {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "numeric"
    },
    R: {}
  };

  try {
    const discordFormats = {
      t: `<t:${timestamp}:t>`,
      T: `<t:${timestamp}:T>`,
      d: `<t:${timestamp}:d>`,
      D: `<t:${timestamp}:D>`,
      f: `<t:${timestamp}:f>`,
      F: `<t:${timestamp}:F>`,
      R: `<t:${timestamp}:R>`
    };

    const displayFormats = {
      t: new Intl.DateTimeFormat(locale, previewOptions.t).format(date),
      T: new Intl.DateTimeFormat(locale, previewOptions.T).format(date),
      d: new Intl.DateTimeFormat(locale, previewOptions.d).format(date),
      D: new Intl.DateTimeFormat(locale, previewOptions.D).format(date),
      f: new Intl.DateTimeFormat(locale, previewOptions.f).format(date),
      F: new Intl.DateTimeFormat(locale, previewOptions.F).format(date),
      R: getRelativeTime(date)
    };

    return {
      unixTimestamp: { display: timestamp, copy: timestamp },
      shortTime: { display: displayFormats.t, copy: discordFormats.t },
      longTime: { display: displayFormats.T, copy: discordFormats.T },
      shortDate: { display: displayFormats.d, copy: discordFormats.d },
      longDate: { display: displayFormats.D, copy: discordFormats.D },
      longDateShortTime: { display: displayFormats.f, copy: discordFormats.f },
      longDateDayShortTime: { display: displayFormats.F, copy: discordFormats.F },
      relative: { display: displayFormats.R, copy: discordFormats.R }
    };
  } catch (error) {
    debugLog("Error formatting date:", error);
     return {
        unixTimestamp: { display: "Error", copy: "Error" },
        shortTime: { display: "Error", copy: "Error" },
        longTime: { display: "Error", copy: "Error" },
        shortDate: { display: "Error", copy: "Error" },
        longDate: { display: "Error", copy: "Error" },
        longDateShortTime: { display: "Error", copy: "Error" },
        longDateDayShortTime: { display: "Error", copy: "Error" },
        relative: { display: "Error", copy: "Error" }
    };
  }
}

function getRelativeTime(date) {
  if (!date || isNaN(date.getTime())) return "Invalid Date";

  const now = new Date();
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

  if ("RelativeTimeFormat" in Intl) {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const absSeconds = Math.abs(diffSeconds);

    if (absSeconds < 60) return rtf.format(diffSeconds, "second");

    const diffMinutes = Math.round(diffSeconds / 60);
    if (absSeconds < 3600) return rtf.format(diffMinutes, "minute");

    const diffHours = Math.round(diffMinutes / 60);
    if (absSeconds < 86400) return rtf.format(diffHours, "hour");

    const diffDays = Math.round(diffHours / 24);
    if (absSeconds < 2592000) return rtf.format(diffDays, "day");

    const diffMonths = Math.round(diffDays / 30.44);
    if (absSeconds < 31536000) return rtf.format(diffMonths, "month");

    const diffYears = Math.round(diffDays / 365.25);
    return rtf.format(diffYears, "year");
  } else {
    /* Fallback */
    if (diffSeconds === 0) return "just now";
    const tense = diffSeconds < 0 ? "ago" : "from now";
    const absSeconds = Math.abs(diffSeconds);
    if (absSeconds < 60) return `${absSeconds} seconds ${tense}`;
    const minutes = Math.round(absSeconds / 60);
    if (minutes < 60) return `${minutes} minutes ${tense}`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hours ${tense}`;
    const days = Math.round(hours / 24);
    return `${days} days ${tense}`;
  }
}

export { formatDateTime, getRelativeTime };
