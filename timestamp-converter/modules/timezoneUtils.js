// modules/timezoneUtils.js

const DEBUG = false;
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

/**
 * Get the UTC offset in minutes for a specific IANA timezone at a given date.
 * Uses the browser's Intl API - always has current DST rules.
 * @param {Date} date - The date to check
 * @param {string} ianaZone - IANA timezone identifier (e.g., "America/New_York")
 * @returns {number|null} - Offset in minutes from UTC, or null if invalid timezone
 */
function getTimezoneOffsetAtDate(date, ianaZone) {
  try {
    // Get the formatted parts for the given timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const getPart = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    
    // Reconstruct the local time in the target timezone
    const year = getPart('year');
    const month = getPart('month') - 1; // JS months are 0-indexed
    const day = getPart('day');
    const hour = getPart('hour') === 24 ? 0 : getPart('hour'); // Handle midnight edge case
    const minute = getPart('minute');
    const second = getPart('second');
    
    // Create a date as if these components were UTC
    const localAsUtc = Date.UTC(year, month, day, hour, minute, second);
    
    // The difference between the UTC timestamp and "local as UTC" gives us the offset
    const offsetMs = localAsUtc - date.getTime();
    const offsetMinutes = Math.round(offsetMs / 60000);
    
    debugLog(`getTimezoneOffsetAtDate: ${ianaZone} at ${date.toISOString()} = ${offsetMinutes} minutes`);
    return offsetMinutes;
  } catch (error) {
    debugLog(`getTimezoneOffsetAtDate: Invalid timezone ${ianaZone}`, error);
    return null;
  }
}

/**
 * Check if a timezone identifier is valid IANA zone.
 * @param {string} ianaZone - Timezone to validate
 * @returns {boolean}
 */
function isValidTimezone(ianaZone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: ianaZone });
    return true;
  } catch {
    return false;
  }
}

export function determineOffsetInfo(
  tzIdentifier,
  dateComponents,
  loadedData,
) {
  const { ianaMap, offsetMap } = loadedData;
  const { year, month, day, hours, minutes, seconds } = dateComponents;

  // 1. Handle explicit UTC/Z
  if (tzIdentifier === "Z" || tzIdentifier?.toUpperCase() === "UTC" || tzIdentifier?.toUpperCase() === "GMT") {
    debugLog("Offset determined as UTC/Z/GMT");
    return { type: "utc" };
  }

  // 2. Handle explicit offsets (+/-HH:MM or +/-HHMM)
  const explicitOffsetRegex = /^([+-])(\d{1,2}):?(\d{2})?$/;
  const hhmmOffsetRegex = /^([+-])(\d{2})(\d{2})$/;
  let match = tzIdentifier?.match(explicitOffsetRegex);
  if (match) {
    const sign = match[1] === "+" ? 1 : -1;
    const offsetHours = parseInt(match[2], 10);
    const offsetMinutes = match[3] ? parseInt(match[3], 10) : 0;
    if (Math.abs(offsetHours) <= 14 && Math.abs(offsetMinutes) <= 59) {
      const totalMinutes = sign * (offsetHours * 60 + offsetMinutes);
      debugLog(`Offset determined as explicit: ${totalMinutes} mins`);
      return { type: "offset", totalMinutes: totalMinutes };
    }
  } else {
    match = tzIdentifier?.match(hhmmOffsetRegex);
    if (match) {
      const sign = match[1] === "+" ? 1 : -1;
      const offsetHours = parseInt(match[2], 10);
      const offsetMinutes = parseInt(match[3], 10);
      if (Math.abs(offsetHours) <= 14 && Math.abs(offsetMinutes) <= 59) {
        const totalMinutes = sign * (offsetHours * 60 + offsetMinutes);
        debugLog(`Offset determined as explicit HHMM: ${totalMinutes} mins`);
        return { type: "offset", totalMinutes: totalMinutes };
      }
    }
  }

  // 3. Handle timezone abbreviations using Intl API for DST
  if (tzIdentifier && ianaMap) {
    const ianaZone = ianaMap[tzIdentifier] || ianaMap[tzIdentifier.toUpperCase()];
    
    if (ianaZone && isValidTimezone(ianaZone)) {
      debugLog(`Mapping ${tzIdentifier} to IANA: ${ianaZone}`);
      
      // Create a provisional date to determine the offset
      // Using the standard offset as initial guess, then refining with Intl
      const provisionalUtc = new Date(Date.UTC(year, month, day, hours, minutes, seconds || 0));
      
      // Get the fallback offset from offsetMap if available
      const offsets = offsetMap?.[tzIdentifier] || offsetMap?.[tzIdentifier.toUpperCase()];
      const fallbackOffset = offsets?.standard || 0;
      
      // Adjust provisional date by fallback offset to get approximate UTC
      const approxUtc = new Date(provisionalUtc.getTime() - fallbackOffset * 60000);
      
      // Now use Intl to get the real offset at that moment
      const realOffset = getTimezoneOffsetAtDate(approxUtc, ianaZone);
      
      if (realOffset !== null) {
        debugLog(`Intl API determined offset for ${ianaZone}: ${realOffset} minutes`);
        return { type: "offset", totalMinutes: realOffset };
      }
      
      // Fallback to static offset if Intl fails
      if (offsets && typeof offsets.standard === "number") {
        debugLog(`Using fallback static offset: ${offsets.standard} minutes`);
        return { type: "offset", totalMinutes: offsets.standard };
      }
    } else if (ianaZone) {
      debugLog(`IANA zone ${ianaZone} not supported by browser, checking static offsets`);
      // Fallback to static offsets for unsupported zones
      const offsets = offsetMap?.[tzIdentifier] || offsetMap?.[tzIdentifier.toUpperCase()];
      if (offsets && typeof offsets.standard === "number") {
        return { type: "offset", totalMinutes: offsets.standard };
      }
    }
  }

  // 4. Try direct IANA zone lookup (user might have entered "America/New_York")
  if (tzIdentifier && isValidTimezone(tzIdentifier)) {
    debugLog(`Direct IANA zone: ${tzIdentifier}`);
    const provisionalUtc = new Date(Date.UTC(year, month, day, hours, minutes, seconds || 0));
    const realOffset = getTimezoneOffsetAtDate(provisionalUtc, tzIdentifier);
    if (realOffset !== null) {
      return { type: "offset", totalMinutes: realOffset };
    }
  }

  // 5. Fallback: Assume local time
  debugLog("Offset determined as local (fallback)");
  return null;
}
