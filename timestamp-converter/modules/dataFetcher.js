// modules/dataFetcher.js
export async function loadTimezoneData() {
  try {
    const [dstResponse, ianaMapResponse, offsetMapResponse] =
      await Promise.all([
        fetch("data/daylight_saving_times.json"),
        fetch("data/abbreviation_to_iana.json"),
        fetch("data/abbreviation_offsets.json"),
      ]);

    if (!dstResponse.ok || !ianaMapResponse.ok || !offsetMapResponse.ok) {
      // Log specific errors
      if (!dstResponse.ok) console.error(`Failed to fetch DST data: ${dstResponse.status} ${dstResponse.statusText}`);
      if (!ianaMapResponse.ok) console.error(`Failed to fetch IANA map: ${ianaMapResponse.status} ${ianaMapResponse.statusText}`);
      if (!offsetMapResponse.ok) console.error(`Failed to fetch Offset map: ${offsetMapResponse.status} ${offsetMapResponse.statusText}`);
      throw new Error("Failed to fetch one or more timezone data files.");
    }

    const dstData = await dstResponse.json();
    const ianaMap = await ianaMapResponse.json();
    const offsetMap = await offsetMapResponse.json();

    console.log("Timezone data loaded successfully.");
    return { dstData, ianaMap, offsetMap };
  } catch (error) {
    console.error("Error loading timezone data:", error);
    return null; // Indicate failure
  }
}
