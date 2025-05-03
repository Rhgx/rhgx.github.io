// modules/formatter.js
function formatDateTime(date) {
    if (!date || isNaN(date.getTime())) {
      debugLog("Invalid date passed to formatDateTime:", date);
      return Object.keys(outputFields).reduce((acc, key) => {
        acc[key] = { display: "Error", copy: "Error" };
        return acc;
      }, {});
    }

    const locale = undefined; // Use user's default locale
    const timestamp = Math.floor(date.getTime() / 1000);

    if (isNaN(timestamp)) {
      debugLog("Calculated timestamp is NaN in formatDateTime");
      return Object.keys(outputFields).reduce((acc, key) => {
        acc[key] = { display: "Error", copy: "Error" };
        return acc;
      }, {});
    }

    // Discord format codes and corresponding Intl options
    const previewOptions = {
      t: { timeStyle: "short" }, // Short Time: 10:30 AM
      T: { timeStyle: "medium" }, // Long Time: 10:30:00 AM
      d: { dateStyle: "short" }, // Short Date: 5/3/2025
      D: { dateStyle: "long" }, // Long Date: May 3, 2025
      f: { dateStyle: "long", timeStyle: "short" }, // Long Date Short Time: May 3, 2025 10:30 AM
      F: {
        // Long Date Day Short Time: Saturday, May 3, 2025 10:30 AM
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      },
      R: {}, // Relative Time: handled separately
    };

    try {
      const discordFormats = {
        t: `<t:${timestamp}:t>`,
        T: `<t:${timestamp}:T>`,
        d: `<t:${timestamp}:d>`,
        D: `<t:${timestamp}:D>`,
        f: `<t:${timestamp}:f>`,
        F: `<t:${timestamp}:F>`,
        R: `<t:${timestamp}:R>`,
      };

      const displayFormats = {
        t: new Intl.DateTimeFormat(locale, previewOptions.t).format(date),
        T: new Intl.DateTimeFormat(locale, previewOptions.T).format(date),
        d: new Intl.DateTimeFormat(locale, previewOptions.d).format(date),
        D: new Intl.DateTimeFormat(locale, previewOptions.D).format(date),
        f: new Intl.DateTimeFormat(locale, previewOptions.f).format(date),
        F: new Intl.DateTimeFormat(locale, previewOptions.F).format(date),
        R: getRelativeTime(date), // Calculate relative time dynamically
      };

      return {
        unixTimestamp: { display: timestamp, copy: timestamp },
        shortTime: { display: displayFormats.t, copy: discordFormats.t },
        longTime: { display: displayFormats.T, copy: discordFormats.T },
        shortDate: { display: displayFormats.d, copy: discordFormats.d },
        longDate: { display: displayFormats.D, copy: discordFormats.D },
        longDateShortTime: {
          display: displayFormats.f,
          copy: discordFormats.f,
        },
        longDateDayShortTime: {
          display: displayFormats.F,
          copy: discordFormats.F,
        },
        relative: { display: displayFormats.R, copy: discordFormats.R },
      };
    } catch (error) {
      debugLog("Error formatting date:", error);
      // Return error structure if Intl formatting fails
      return Object.keys(outputFields).reduce((acc, key) => {
        acc[key] = { display: "Error", copy: "Error" };
        return acc;
      }, {});
    }
  }

  function getRelativeTime(date) {
    if (!date || isNaN(date.getTime())) return "Invalid Date";

    const now = new Date();
    const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

    // Use Intl.RelativeTimeFormat if available (modern browsers)
    if ("RelativeTimeFormat" in Intl) {
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }); // 'undefined' uses default locale
      const absSeconds = Math.abs(diffSeconds);

      if (absSeconds < 60) return rtf.format(diffSeconds, "second");

      const diffMinutes = Math.round(diffSeconds / 60);
      if (absSeconds < 3600) return rtf.format(diffMinutes, "minute");

      const diffHours = Math.round(diffMinutes / 60);
      if (absSeconds < 86400) return rtf.format(diffHours, "hour");

      const diffDays = Math.round(diffHours / 24);
      // Use a threshold slightly less than a month/year to avoid rounding issues
      if (absSeconds < 2592000 /* ~30 days */)
        return rtf.format(diffDays, "day");

      // Approximate months/years
      const diffMonths = Math.round(diffDays / 30.44); // Average days in month
      if (absSeconds < 31536000 /* ~365 days */)
        return rtf.format(diffMonths, "month");

      const diffYears = Math.round(diffDays / 365.25); // Account for leap years
      return rtf.format(diffYears, "year");
    } else {
      // Fallback for older browsers
      if (diffSeconds === 0) return "just now";

      const tense = diffSeconds < 0 ? "ago" : "from now";
      const absSeconds = Math.abs(diffSeconds);

      if (absSeconds < 60) return `${absSeconds} seconds ${tense}`;

      const minutes = Math.round(absSeconds / 60);
      if (minutes < 60) return `${minutes} minutes ${tense}`;

      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours} hours ${tense}`;

      const days = Math.round(hours / 24);
      // Simple fallback doesn't handle months/years well
      return `${days} days ${tense}`;
    }
  }
  
  export { formatDateTime, getRelativeTime }; // Export them
