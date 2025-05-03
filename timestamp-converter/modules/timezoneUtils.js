// modules/timezoneUtils.js

/**
 * Checks if a given UTC timestamp (in seconds) falls within a DST period
 * for a specific IANA zone, based on the loaded DST data.
 */
function isDstActive(utcTimestampSeconds, ianaZone, dstData) {
    if (!dstData || !dstData[ianaZone]) {
      // console.warn(`No DST data found for zone: ${ianaZone}`);
      return false; // No data, assume not DST
    }
  
    const zonePeriods = dstData[ianaZone];
    const date = new Date(utcTimestampSeconds * 1000); // Convert seconds to ms
    const year = date.getUTCFullYear();
  
    // Find a period covering the current year
    // This assumes keys like "YYYY-YYYY" or just "YYYY" might exist
    let relevantPeriodKey = null;
    for (const periodKey in zonePeriods) {
      if (periodKey.includes("-")) {
        const [startYear, endYear] = periodKey.split("-").map(Number);
        if (year >= startYear && year <= endYear) {
          relevantPeriodKey = periodKey;
          break;
        }
      } else if (parseInt(periodKey, 10) === year) {
        relevantPeriodKey = periodKey;
        break;
      }
    }
  
    if (!relevantPeriodKey) {
      // console.warn(`No DST period found for year ${year} in zone: ${ianaZone}`);
      return false;
    }
  
    const [dstStartTimestamp, dstEndTimestamp] = zonePeriods[relevantPeriodKey];
  
    // Check if the timestamp falls within the DST range (inclusive start, exclusive end)
    // Timestamps in the JSON are start/end of DST for that period.
    return (
      utcTimestampSeconds >= dstStartTimestamp &&
      utcTimestampSeconds <= dstEndTimestamp // Using <= as the JSON seems to include the end second
    );
  }
  
  /**
   * Determines the correct UTC offset info based on identifier, date, and loaded data.
   * Handles explicit offsets, abbreviations, and DST checks.
   */
  export function determineOffsetInfo(
    tzIdentifier,
    dateComponents,
    loadedData,
  ) {
    const { dstData, ianaMap, offsetMap } = loadedData;
    const { year, month, day, hours, minutes, seconds } = dateComponents;
  
    // 1. Handle explicit UTC/Z
    if (tzIdentifier === "Z" || tzIdentifier?.toUpperCase() === "UTC") {
      console.log("Offset determined as UTC/Z");
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
        console.log(`Offset determined as explicit: ${totalMinutes} mins`);
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
          console.log(`Offset determined as explicit HHMM: ${totalMinutes} mins`);
          return { type: "offset", totalMinutes: totalMinutes };
        }
      }
    }
  
    // 3. Handle Abbreviations (including DST check)
    if (tzIdentifier && ianaMap && offsetMap && dstData) {
      const upperTzIdentifier = tzIdentifier.toUpperCase();
      const ianaZone = ianaMap[upperTzIdentifier];
      const offsets = offsetMap[upperTzIdentifier];
  
      if (ianaZone && offsets) {
        console.log(`Mapping ${upperTzIdentifier} to IANA: ${ianaZone}`);
        console.log(`Offsets for ${upperTzIdentifier}:`, offsets);
  
        // Determine the standard offset in minutes (mandatory)
        if (typeof offsets.standard !== "number") {
          console.error(`Standard offset missing for ${upperTzIdentifier}`);
          return null; // Cannot proceed without standard offset
        }
        const standardOffsetMinutes = offsets.standard;
  
        // Create a *provisional* date assuming STANDARD time to check DST status
        // We construct it as if the input time *was* in standard time, then find its UTC equivalent
        const provisionalDateStandard = new Date(
          Date.UTC(year, month, day, hours, minutes, seconds),
        );
        // Adjust UTC time BACKWARDS by the standard offset to get the actual UTC time
        provisionalDateStandard.setUTCMinutes(
          provisionalDateStandard.getUTCMinutes() - standardOffsetMinutes,
        );
  
        const provisionalUTCTimestampSeconds = Math.floor(
          provisionalDateStandard.getTime() / 1000,
        );
  
        console.log(
          `Checking DST for ${ianaZone} at provisional UTC timestamp: ${provisionalUTCTimestampSeconds} (${provisionalDateStandard.toISOString()})`,
        );
  
        // Check if DST is active for this timestamp and zone
        const dstIsActive = isDstActive(
          provisionalUTCTimestampSeconds,
          ianaZone,
          dstData,
        );
  
        if (dstIsActive && typeof offsets.daylight === "number") {
          console.log(`DST is active for ${ianaZone}. Using daylight offset.`);
          return { type: "offset", totalMinutes: offsets.daylight };
        } else {
          console.log(`DST not active or no DST offset defined for ${ianaZone}. Using standard offset.`);
          return { type: "offset", totalMinutes: standardOffsetMinutes };
        }
      } else {
        console.warn(
          `No IANA zone or offset data found for abbreviation: ${tzIdentifier}`,
        );
      }
    }
  
    // 4. Fallback: Assume local time if no identifier or no match
    console.log("Offset determined as local (fallback)");
    return null;
  }
  