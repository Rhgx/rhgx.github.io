// modules/parser.js
import { determineOffsetInfo } from "./timezoneUtils.js";

const DEBUG = false;
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function extractTimezoneIdentifier(inputStr, ianaMap) {
  let originalInput = inputStr;
  let cleanedStr = inputStr.trim();
  let tzIdentifier = null;
  let foundTzLength = 0;

  const explicitOffsetRegex =
    /(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?\s*$/i;
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

  if (ianaMap) {
    const longKeys = Object.keys(ianaMap)
      .filter((key) => key.includes(" ") || key.includes("("))
      .sort((a, b) => b.length - a.length);

    for (const longKey of longKeys) {
       // Use a regex to ensure the long key is at the end, potentially preceded by space
       // Escape parentheses in the key for the regex
       const escapedKey = longKey.replace(/[()]/g, '\\$&');
       const longKeyRegex = new RegExp(`(?:\\s|^)${escapedKey}\\s*$`, "i");
       match = cleanedStr.match(longKeyRegex);

       if (match) {
           // Find the actual matched string length (including potential leading space)
           const matchedString = match[0];
           tzIdentifier = longKey; // Use the exact key from the map
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

  const abbrRegex = /\b([A-Z]{3,5})\s*$/i;
  match = cleanedStr.match(abbrRegex);
  if (match) {
    const potentialAbbr = match[1].toUpperCase();
    if (ianaMap && ianaMap[potentialAbbr]) {
      tzIdentifier = potentialAbbr;
      foundTzLength = match[0].length;
      debugLog(`Extractor: Found standard abbreviation: ${tzIdentifier}`);
    } else {
        debugLog(`Extractor: Found potential abbr "${potentialAbbr}" but it's not in the map.`);
    }
  }

  if (tzIdentifier) {
     cleanedStr = cleanedStr.substring(0, cleanedStr.length - foundTzLength);
  }

  debugLog(
    `Extractor Final Result: Cleaned: "${cleanedStr}", Identifier:`,
    tzIdentifier,
  );
  return { cleanedStr: cleanedStr.trim(), extractedTzIdentifier: tzIdentifier };
}

export function parseDateTime(inputStr, loadedData) {
  if (!loadedData || !loadedData.ianaMap) {
    console.error("IANA map data not available for parsing.");
    return null;
  }
  inputStr = inputStr.trim();
  let parsedDate = null;

  const { cleanedStr, extractedTzIdentifier } = extractTimezoneIdentifier(
    inputStr,
    loadedData.ianaMap,
  );

  const isoWithOffsetRegex =
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2}|[+-]\d{4})?$/i;
  if (isoWithOffsetRegex.test(inputStr)) {
    try {
      const potentialDate = new Date(inputStr);
      if (!isNaN(potentialDate.getTime())) {
        const year = potentialDate.getFullYear();
        if (year > 1900 && year < 3000) {
          debugLog(
            "Parser: Used native Date() constructor for ISO8601 format.",
          );
          return potentialDate;
        }
      }
    } catch (e) { /* Ignore native parsing errors */ }
  }

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

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 0 || month > 11) return null;
  if (year < 1900 || year > 3000) return null;
  const daysInMonth = [ 31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
  if (day < 1 || day > daysInMonth[month]) return null;
  const tempDateCheck = new Date(Date.UTC(year, month, day));
  if ( isNaN(tempDateCheck.getTime()) || tempDateCheck.getUTCFullYear() !== year || tempDateCheck.getUTCMonth() !== month || tempDateCheck.getUTCDate() !== day ) {
    return null;
  }

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
    const targetTimeNow = new Date( nowUtc.getTime() + preliminaryOffsetInfo.totalMinutes * 60000, );
    today = targetTimeNow;
    debugLog( "parseTimeOnly: Using today's date adjusted for target offset:", today.toISOString(), );
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

    const timeHMS_Regex = /^(\d{1,2})([:.])(\d{2})(?:[:.](\d{2}))?/;
    const timeH_AmPm_Regex = /^(\d{1,2})\s*(AM|PM)/;

    let timeMatch = timeStr.match(timeHMS_Regex);
    let amPmOnlyMatch = !timeMatch ? timeStr.match(timeH_AmPm_Regex) : null;
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
        const isPM = amPmOnlyMatch[2] === "PM";
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
