// modules/dataFetcher.js

/**
 * Load timezone data files.
 * Note: DST detection now uses browser's Intl API, so daylight_saving_times.json is no longer needed.
 */
export async function loadTimezoneData() {
  try {
    const [ianaMapResponse, offsetMapResponse] = await Promise.all([
      fetch("data/abbreviation_to_iana.json"),
      fetch("data/abbreviation_offsets.json"),
    ]);

    if (!ianaMapResponse.ok || !offsetMapResponse.ok) {
      if (!ianaMapResponse.ok) console.error(`Failed to fetch IANA map: ${ianaMapResponse.status} ${ianaMapResponse.statusText}`);
      if (!offsetMapResponse.ok) console.error(`Failed to fetch Offset map: ${offsetMapResponse.status} ${offsetMapResponse.statusText}`);
      throw new Error("Failed to fetch one or more timezone data files.");
    }

    const ianaMap = await ianaMapResponse.json();
    const offsetMap = await offsetMapResponse.json();

    console.log("Timezone data loaded successfully.");
    return { ianaMap, offsetMap };
  } catch (error) {
    console.error("Error loading timezone data:", error);
    return null;
  }
}
