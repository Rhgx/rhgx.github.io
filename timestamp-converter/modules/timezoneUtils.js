// modules/timezoneUtils.js

function isDstActive(utcTimestampSeconds, ianaZone, dstData) {
  if (!dstData || !dstData[ianaZone]) {
    return false;
  }

  const zonePeriods = dstData[ianaZone];
  const date = new Date(utcTimestampSeconds * 1000);
  const year = date.getUTCFullYear();

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
    return false;
  }

  const [dstStartTimestamp, dstEndTimestamp] = zonePeriods[relevantPeriodKey];

  return (
    utcTimestampSeconds >= dstStartTimestamp &&
    utcTimestampSeconds <= dstEndTimestamp
  );
}

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
  // Use the *exact* identifier provided (could be short or long form)
  if (tzIdentifier && ianaMap && offsetMap && dstData) {
    const ianaZone = ianaMap[tzIdentifier]; // Use the identifier directly as the key
    const offsets = offsetMap[tzIdentifier.toUpperCase()]; // Offsets map might still use uppercase keys

    if (ianaZone && offsets) {
      console.log(`Mapping ${tzIdentifier} to IANA: ${ianaZone}`);
      console.log(`Offsets for ${tzIdentifier}:`, offsets);

      if (typeof offsets.standard !== "number") {
        console.error(`Standard offset missing for ${tzIdentifier}`);
        return null;
      }
      const standardOffsetMinutes = offsets.standard;

      const provisionalDateStandard = new Date(
        Date.UTC(year, month, day, hours, minutes, seconds),
      );
      provisionalDateStandard.setUTCMinutes(
        provisionalDateStandard.getUTCMinutes() - standardOffsetMinutes,
      );

      const provisionalUTCTimestampSeconds = Math.floor(
        provisionalDateStandard.getTime() / 1000,
      );

      console.log(
        `Checking DST for ${ianaZone} at provisional UTC timestamp: ${provisionalUTCTimestampSeconds} (${provisionalDateStandard.toISOString()})`,
      );

      const dstIsActive = isDstActive(
        provisionalUTCTimestampSeconds,
        ianaZone,
        dstData,
      );

      if (dstIsActive && typeof offsets.daylight === "number") {
        console.log(`DST is active for ${ianaZone}. Using daylight offset.`);
        return { type: "offset", totalMinutes: offsets.daylight };
      } else {
        console.log(
          `DST not active or no DST offset defined for ${ianaZone}. Using standard offset.`,
        );
        return { type: "offset", totalMinutes: standardOffsetMinutes };
      }
    } else {
      console.warn(
        `No IANA zone or offset data found for identifier: ${tzIdentifier}`,
      );
    }
  }

  // 4. Fallback: Assume local time
  console.log("Offset determined as local (fallback)");
  return null;
}
