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
        throw new Error("Failed to fetch timezone data files.");
      }
  
      const dstData = await dstResponse.json();
      const ianaMap = await ianaMapResponse.json();
      const offsetMap = await offsetMapResponse.json();
  
      console.log("Timezone data loaded successfully.");
      return { dstData, ianaMap, offsetMap };
    } catch (error) {
      console.error("Error loading timezone data:", error);
      // Provide fallback or default data if necessary, or re-throw
      return null; // Indicate failure
    }
  }
  