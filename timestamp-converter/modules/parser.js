// modules/parser.js
import { determineOffsetInfo } from "./timezoneUtils.js";

const DEBUG = false;
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

// Month name mappings
const MONTH_NAMES = {
  'january': 0, 'jan': 0,
  'february': 1, 'feb': 1,
  'march': 2, 'mar': 2,
  'april': 3, 'apr': 3,
  'may': 4,
  'june': 5, 'jun': 5,
  'july': 6, 'jul': 6,
  'august': 7, 'aug': 7,
  'september': 8, 'sep': 8, 'sept': 8,
  'october': 9, 'oct': 9,
  'november': 10, 'nov': 10,
  'december': 11, 'dec': 11
};

// Relative time keywords
const RELATIVE_KEYWORDS = {
  'now': () => new Date(),
  'today': () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },
  'tomorrow': () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  'yesterday': () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  'next week': () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  'last week': () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  'next month': () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  'last month': () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
};

function extractTimezoneIdentifier(inputStr, ianaMap) {
  let cleanedStr = inputStr.trim();
  let tzIdentifier = null;
  let foundTzLength = 0;

  const explicitOffsetRegex = /(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?\s*$/i;
  const hhmmOffsetRegex = /([+-]\d{4})\s*$/i;
  const zuluRegex = /\b(Z|UTC|GMT)\b\s*$/i;

  let match = cleanedStr.match(explicitOffsetRegex);
  if (match) {
    const sign = match[1];
    const hours = match[2].padStart(2, "0");
    const minutes = (match[3] || "00").padStart(2, "0");
    tzIdentifier = `${sign}${hours}:${minutes}`;
    foundTzLength = match[0].length;
    debugLog("Extractor: Found explicit offset", tzIdentifier);
  } else {
    match = cleanedStr.match(hhmmOffsetRegex);
    if (match) {
      const sign = match[1][0];
      const hours = match[1].substring(1, 3);
      const minutes = match[1].substring(3, 5);
      tzIdentifier = `${sign}${hours}:${minutes}`;
      foundTzLength = match[0].length;
      debugLog("Extractor: Found HHMM offset", tzIdentifier);
    } else {
      match = cleanedStr.match(zuluRegex);
      if (match) {
        tzIdentifier = "Z";
        foundTzLength = match[0].length;
        debugLog("Extractor: Found Z/UTC/GMT");
      }
    }
  }

  if (tzIdentifier) {
    cleanedStr = cleanedStr.substring(0, cleanedStr.length - foundTzLength);
    return { cleanedStr: cleanedStr.trim(), extractedTzIdentifier: tzIdentifier };
  }

  // Check for long-form timezone keys (e.g., "IST (Ireland)")
  if (ianaMap) {
    const longKeys = Object.keys(ianaMap)
      .filter((key) => key.includes(" ") || key.includes("("))
      .sort((a, b) => b.length - a.length);

    for (const longKey of longKeys) {
      const escapedKey = longKey.replace(/[()]/g, '\\$&');
      const longKeyRegex = new RegExp(`(?:\\s|^)${escapedKey}\\s*$`, "i");
      match = cleanedStr.match(longKeyRegex);

      if (match) {
        const matchedString = match[0];
        tzIdentifier = longKey;
        foundTzLength = matchedString.length;
        debugLog(`Extractor: Found long-form key: ${tzIdentifier}`);
        break;
      }
    }
  }

  if (tzIdentifier) {
    cleanedStr = cleanedStr.substring(0, cleanedStr.length - foundTzLength);
    return { cleanedStr: cleanedStr.trim(), extractedTzIdentifier: tzIdentifier };
  }

  // Check for standard abbreviations
  const abbrRegex = /\b([A-Z]{3,5})\s*$/i;
  match = cleanedStr.match(abbrRegex);
  if (match) {
    const potentialAbbr = match[1].toUpperCase();
    if (ianaMap && ianaMap[potentialAbbr]) {
      tzIdentifier = potentialAbbr;
      foundTzLength = match[0].length;
      debugLog(`Extractor: Found standard abbreviation: ${tzIdentifier}`);
    }
  }

  if (tzIdentifier) {
    cleanedStr = cleanedStr.substring(0, cleanedStr.length - foundTzLength);
  }

  // Check for full IANA zone names (e.g., "America/New_York")
  const ianaZoneRegex = /\b([A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)\s*$/;
  match = cleanedStr.match(ianaZoneRegex);
  if (match) {
    tzIdentifier = match[1];
    foundTzLength = match[0].length;
    cleanedStr = cleanedStr.substring(0, cleanedStr.length - foundTzLength);
    debugLog(`Extractor: Found IANA zone: ${tzIdentifier}`);
  }

  debugLog(`Extractor Final Result: Cleaned: "${cleanedStr}", Identifier:`, tzIdentifier);
  return { cleanedStr: cleanedStr.trim(), extractedTzIdentifier: tzIdentifier };
}

export function parseDateTime(inputStr, loadedData) {
  if (!loadedData || !loadedData.ianaMap) {
    console.error("IANA map data not available for parsing.");
    return null;
  }
  inputStr = inputStr.trim();
  let parsedDate = null;

  // 1. Try Unix timestamp (numeric only)
  parsedDate = parseUnixTimestamp(inputStr);
  if (parsedDate) {
    debugLog("Parser: Matched Unix timestamp");
    return parsedDate;
  }

  // 2. Try Discord format <t:timestamp:style>
  parsedDate = parseDiscordFormat(inputStr);
  if (parsedDate) {
    debugLog("Parser: Matched Discord format");
    return parsedDate;
  }

  // 3. Try relative keywords
  parsedDate = parseRelativeKeyword(inputStr);
  if (parsedDate) {
    debugLog("Parser: Matched relative keyword");
    return parsedDate;
  }

  // 4. Try "in X hours/days/weeks" format
  parsedDate = parseRelativeOffset(inputStr);
  if (parsedDate) {
    debugLog("Parser: Matched relative offset");
    return parsedDate;
  }

  const { cleanedStr, extractedTzIdentifier } = extractTimezoneIdentifier(
    inputStr,
    loadedData.ianaMap,
  );

  // 5. Try ISO8601 with native Date
  const isoWithOffsetRegex = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2}|[+-]\d{4})?$/i;
  if (isoWithOffsetRegex.test(inputStr)) {
    try {
      const potentialDate = new Date(inputStr);
      if (!isNaN(potentialDate.getTime())) {
        const year = potentialDate.getFullYear();
        if (year > 1900 && year < 3000) {
          debugLog("Parser: Used native Date() constructor for ISO8601 format.");
          return potentialDate;
        }
      }
    } catch (e) { /* Ignore native parsing errors */ }
  }

  // 6. Try ISO date only (YYYY-MM-DD without time)
  parsedDate = parseISODateOnly(cleanedStr, extractedTzIdentifier, loadedData);
  if (parsedDate) {
    debugLog("Parser: Matched ISO date only");
    return parsedDate;
  }

  // 7. Try natural date format (Month Day, Year)
  parsedDate = parseNaturalDate(cleanedStr, extractedTzIdentifier, loadedData);
  if (parsedDate) {
    debugLog("Parser: Matched natural date");
    return parsedDate;
  }

  // 8. Try US date format (MM/DD/YYYY)
  parsedDate = parseUSDate(cleanedStr, extractedTzIdentifier, loadedData);
  if (parsedDate) {
    debugLog("Parser: Matched US date format");
    return parsedDate;
  }

  // 9. Try European date-time format (Time @ D/M/Y)
  const europeanDateTimeMatch = cleanedStr.match(
    /^(.*?)\s*@\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})$/i,
  );
  if (europeanDateTimeMatch) {
    debugLog("Parser: Matched Time @ D/M/Y format.");
    const timePartStr = europeanDateTimeMatch[1].trim();
    const datePartStr = europeanDateTimeMatch[2];
    parsedDate = parseEuropeanDateAndTime(
      datePartStr,
      timePartStr,
      extractedTzIdentifier,
      loadedData,
    );
    if (parsedDate) return parsedDate;
  }

  // 10. Try time-only format
  if (!parsedDate) {
    debugLog("Parser: Attempting time-only format.");
    parsedDate = parseTimeOnly(
      cleanedStr,
      extractedTzIdentifier,
      loadedData,
    );
    if (parsedDate) return parsedDate;
  }

  debugLog("Parser: All parsing attempts failed.");
  return null;
}

// === NEW PARSERS ===

function parseUnixTimestamp(inputStr) {
  // Match pure numeric input (Unix timestamp in seconds)
  const trimmed = inputStr.trim();
  if (/^\d{9,13}$/.test(trimmed)) {
    let timestamp = parseInt(trimmed, 10);
    // If more than 10 digits, assume milliseconds
    if (trimmed.length > 10) {
      timestamp = Math.floor(timestamp / 1000);
    }
    const date = new Date(timestamp * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

function parseDiscordFormat(inputStr) {
  // Match <t:timestamp:style> or <t:timestamp>
  const discordMatch = inputStr.match(/^<t:(\d+)(?::[tTdDfFR])?>$/);
  if (discordMatch) {
    const timestamp = parseInt(discordMatch[1], 10);
    const date = new Date(timestamp * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

function parseRelativeKeyword(inputStr) {
  const lower = inputStr.toLowerCase().trim();
  if (RELATIVE_KEYWORDS[lower]) {
    return RELATIVE_KEYWORDS[lower]();
  }
  return null;
}

function parseRelativeOffset(inputStr) {
  // Match "in X hours/days/weeks/months" or "X hours/days ago"
  const inMatch = inputStr.match(/^in\s+(\d+)\s+(second|minute|hour|day|week|month)s?$/i);
  const agoMatch = inputStr.match(/^(\d+)\s+(second|minute|hour|day|week|month)s?\s+ago$/i);
  
  if (inMatch || agoMatch) {
    const match = inMatch || agoMatch;
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multiplier = inMatch ? 1 : -1;
    
    const now = new Date();
    
    switch (unit) {
      case 'second':
        now.setSeconds(now.getSeconds() + amount * multiplier);
        break;
      case 'minute':
        now.setMinutes(now.getMinutes() + amount * multiplier);
        break;
      case 'hour':
        now.setHours(now.getHours() + amount * multiplier);
        break;
      case 'day':
        now.setDate(now.getDate() + amount * multiplier);
        break;
      case 'week':
        now.setDate(now.getDate() + (amount * 7 * multiplier));
        break;
      case 'month':
        now.setMonth(now.getMonth() + amount * multiplier);
        break;
    }
    
    return now;
  }
  return null;
}

function parseISODateOnly(inputStr, tzIdentifier, loadedData) {
  // Match YYYY-MM-DD without time
  const isoDateMatch = inputStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const year = parseInt(isoDateMatch[1], 10);
    const month = parseInt(isoDateMatch[2], 10) - 1;
    const day = parseInt(isoDateMatch[3], 10);
    
    if (isValidDate(year, month, day)) {
      const dateComponents = { year, month, day, hours: 0, minutes: 0, seconds: 0 };
      const offsetInfo = determineOffsetInfo(tzIdentifier, dateComponents, loadedData);
      return constructDate(year, month, day, 0, 0, 0, offsetInfo);
    }
  }
  return null;
}

function parseNaturalDate(inputStr, tzIdentifier, loadedData) {
  // Match "Month Day, Year" or "Month Day Year" with optional time
  // Examples: "January 1, 2024", "Jan 1st 2024 at 3:00 PM", "December 25, 2024 15:30"
  const naturalMatch = inputStr.match(
    /^([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})(?:\s+(?:at\s+)?(.+))?$/i
  );
  
  if (naturalMatch) {
    const monthName = naturalMatch[1].toLowerCase();
    const day = parseInt(naturalMatch[2], 10);
    const year = parseInt(naturalMatch[3], 10);
    const timeStr = naturalMatch[4];
    
    const month = MONTH_NAMES[monthName];
    if (month !== undefined && isValidDate(year, month, day)) {
      let hours = 0, minutes = 0, seconds = 0;
      
      if (timeStr) {
        const timeResult = parseTimeComponents(timeStr, tzIdentifier);
        if (timeResult) {
          hours = timeResult.hours;
          minutes = timeResult.minutes;
          seconds = timeResult.seconds;
          tzIdentifier = timeResult.finalTzIdentifier || tzIdentifier;
        }
      }
      
      const dateComponents = { year, month, day, hours, minutes, seconds };
      const offsetInfo = determineOffsetInfo(tzIdentifier, dateComponents, loadedData);
      return constructDate(year, month, day, hours, minutes, seconds, offsetInfo);
    }
  }
  return null;
}

function parseUSDate(inputStr, tzIdentifier, loadedData) {
  // Match MM/DD/YYYY with optional time
  // Examples: "01/15/2024", "1/5/2024 3:00 PM"
  const usDateMatch = inputStr.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(.+))?$/
  );
  
  if (usDateMatch) {
    const month = parseInt(usDateMatch[1], 10) - 1;
    const day = parseInt(usDateMatch[2], 10);
    const year = parseInt(usDateMatch[3], 10);
    const timeStr = usDateMatch[4];
    
    if (isValidDate(year, month, day)) {
      let hours = 0, minutes = 0, seconds = 0;
      
      if (timeStr) {
        const timeResult = parseTimeComponents(timeStr, tzIdentifier);
        if (timeResult) {
          hours = timeResult.hours;
          minutes = timeResult.minutes;
          seconds = timeResult.seconds;
          tzIdentifier = timeResult.finalTzIdentifier || tzIdentifier;
        }
      }
      
      const dateComponents = { year, month, day, hours, minutes, seconds };
      const offsetInfo = determineOffsetInfo(tzIdentifier, dateComponents, loadedData);
      return constructDate(year, month, day, hours, minutes, seconds, offsetInfo);
    }
  }
  return null;
}

// === EXISTING PARSERS (kept from original) ===

function parseEuropeanDateAndTime(
  dateStr,
  timeStr,
  initialTzIdentifier,
  loadedData,
) {
  const dateParts = dateStr.split(/[./-]/);
  if (dateParts.length !== 3) return null;

  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const year = parseInt(dateParts[2], 10);

  if (!isValidDate(year, month, day)) return null;

  const timeResult = parseTimeComponents(timeStr, initialTzIdentifier);
  if (!timeResult) return null;

  const { hours, minutes, seconds, finalTzIdentifier } = timeResult;
  const dateComponents = { year, month, day, hours, minutes, seconds };

  const finalOffsetInfo = determineOffsetInfo(
    finalTzIdentifier,
    dateComponents,
    loadedData,
  );

  return constructDate(year, month, day, hours, minutes, seconds, finalOffsetInfo);
}

function parseTimeOnly(timeStr, initialTzIdentifier, loadedData) {
  const timeResult = parseTimeComponents(timeStr, initialTzIdentifier);
  if (!timeResult) return null;

  const { hours, minutes, seconds, finalTzIdentifier } = timeResult;

  const preliminaryOffsetInfo = determineOffsetInfo(
    finalTzIdentifier,
    { year: new Date().getFullYear(), month: 0, day: 1, hours, minutes, seconds },
    loadedData,
  );

  let today;
  if (preliminaryOffsetInfo?.type === "offset") {
    const nowUtc = new Date();
    const targetTimeNow = new Date(nowUtc.getTime() + preliminaryOffsetInfo.totalMinutes * 60000);
    today = targetTimeNow;
    debugLog("parseTimeOnly: Using today's date adjusted for target offset:", today.toISOString());
  } else if (preliminaryOffsetInfo?.type === "utc") {
    today = new Date();
    debugLog("parseTimeOnly: Using today's UTC date");
  } else {
    today = new Date();
    debugLog("parseTimeOnly: Using today's local date");
  }

  const year = preliminaryOffsetInfo?.type === "utc" ? today.getUTCFullYear() : today.getFullYear();
  const month = preliminaryOffsetInfo?.type === "utc" ? today.getUTCMonth() : today.getMonth();
  const day = preliminaryOffsetInfo?.type === "utc" ? today.getUTCDate() : today.getDate();

  const dateComponents = { year, month, day, hours, minutes, seconds };

  const finalOffsetInfo = determineOffsetInfo(
    finalTzIdentifier,
    dateComponents,
    loadedData,
  );

  return constructDate(year, month, day, hours, minutes, seconds, finalOffsetInfo);
}

function parseTimeComponents(timeStr, initialTzIdentifier) {
  timeStr = timeStr.toUpperCase().trim();
  debugLog("Parsing time components for:", timeStr, "Initial Identifier:", initialTzIdentifier);
  let hours = 0, minutes = 0, seconds = 0;
  let timePartTzIdentifier = null;

  const timeHMS_Regex = /^(\d{1,2})([:.])(\\d{2})(?:[:.](\\d{2}))?/;
  const timeH_AmPm_Regex = /^(\d{1,2})\s*(AM|PM)/;

  // Fixed regex patterns
  const timeHMSRegex = /^(\d{1,2})([:.])(\d{2})(?:[:.](\d{2}))?/;
  const timeHAmPmRegex = /^(\d{1,2})\s*(AM|PM)/i;

  let timeMatch = timeStr.match(timeHMSRegex);
  let amPmOnlyMatch = !timeMatch ? timeStr.match(timeHAmPmRegex) : null;
  let coreTimeLength = 0;

  if (timeMatch) {
    coreTimeLength = timeMatch[0].length;
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[3], 10);
    seconds = timeMatch[4] ? parseInt(timeMatch[4], 10) : 0;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      debugLog("Invalid HMS components"); return null;
    }
  } else if (amPmOnlyMatch) {
    coreTimeLength = amPmOnlyMatch[0].length;
    hours = parseInt(amPmOnlyMatch[1], 10);
    const isPM = amPmOnlyMatch[2].toUpperCase() === "PM";
    minutes = 0; seconds = 0;
    if (hours < 1 || hours > 12) { debugLog("Invalid H for AM/PM"); return null; }
    if (isPM && hours !== 12) hours += 12;
    else if (!isPM && hours === 12) hours = 0;
  } else {
    debugLog("No core time pattern matched."); return null;
  }

  let remainingStr = timeStr.substring(coreTimeLength).trim();
  debugLog(`Remainder after core time: "${remainingStr}"`);

  if (remainingStr) {
    const explicitOffsetRegex = /^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/;
    let match = remainingStr.match(explicitOffsetRegex);
    if (match) {
      const sign = match[1];
      const h = match[2].padStart(2, "0");
      const m = (match[3] || "00").padStart(2, "0");
      timePartTzIdentifier = `${sign}${h}:${m}`;
      debugLog("Remainder matched explicit offset:", timePartTzIdentifier);
      remainingStr = "";
    } else {
      const hhmmOffsetRegex = /^([+-]\d{2})(\d{2})$/;
      match = remainingStr.match(hhmmOffsetRegex);
      if (match) {
        timePartTzIdentifier = `${match[1]}:${match[2]}`;
        debugLog("Remainder matched HHMM offset:", timePartTzIdentifier);
        remainingStr = "";
      } else if (remainingStr === "Z" || remainingStr === "UTC" || remainingStr === "GMT") {
        timePartTzIdentifier = "Z";
        debugLog("Remainder matched UTC/GMT/Z");
        remainingStr = "";
      } else if ((remainingStr === "AM" || remainingStr === "PM") && timeMatch) {
        const isPM = remainingStr === "PM";
        if (hours < 1 || hours > 12) { debugLog(`Hour ${hours} invalid for AM/PM after H:M:S`); return null; }
        if (isPM && hours !== 12) hours += 12;
        else if (!isPM && hours === 12) hours = 0;
        debugLog(`Adjusted hours for AM/PM: H=${hours}`);
        remainingStr = "";
      }
    }
  }

  if (remainingStr !== "") {
    debugLog(`Unrecognized trailing string after time: "${remainingStr}". Ignoring.`);
  }

  const finalTzIdentifier = timePartTzIdentifier ?? initialTzIdentifier ?? null;
  debugLog("Final determined TZ identifier:", finalTzIdentifier);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    debugLog(`Final time validation failed: H=${hours} M=${minutes} S=${seconds}`); return null;
  }

  debugLog("parseTimeComponents successful:", { hours, minutes, seconds, finalTzIdentifier });
  return { hours, minutes, seconds, finalTzIdentifier };
}

// === HELPER FUNCTIONS ===

function isValidDate(year, month, day) {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 0 || month > 11) return false;
  if (year < 1900 || year > 3000) return false;
  
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  ];
  
  if (day < 1 || day > daysInMonth[month]) return false;
  
  const tempDateCheck = new Date(Date.UTC(year, month, day));
  return !(
    isNaN(tempDateCheck.getTime()) ||
    tempDateCheck.getUTCFullYear() !== year ||
    tempDateCheck.getUTCMonth() !== month ||
    tempDateCheck.getUTCDate() !== day
  );
}

function constructDate(year, month, day, hours, minutes, seconds, offsetInfo) {
  let finalDate;
  debugLog("Constructing date with:", { year, month, day, hours, minutes, seconds, offsetInfo });

  try {
    if (offsetInfo?.type === "offset") {
      const totalOffsetMinutes = offsetInfo.totalMinutes;
      let utcTime = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      utcTime.setUTCMinutes(utcTime.getUTCMinutes() - totalOffsetMinutes);
      finalDate = new Date(utcTime.getTime());
      debugLog(`Constructed with offset: Input ${hours}:${minutes} (offset ${totalOffsetMinutes}m) -> UTC ${finalDate.toISOString()}`);
    } else if (offsetInfo?.type === "utc") {
      finalDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, 0));
      debugLog("Constructed as UTC");
    } else {
      finalDate = new Date(year, month, day, hours, minutes, seconds, 0);
      debugLog("Constructed as Local Time");
    }
    if (isNaN(finalDate.getTime())) { throw new Error("Constructed date resulted in NaN"); }
    debugLog("Constructed Date Object:", finalDate);
    debugLog("Equivalent ISO String:", finalDate.toISOString());
    return finalDate;
  } catch (error) {
    debugLog("Error during date construction:", error);
    return null;
  }
}
