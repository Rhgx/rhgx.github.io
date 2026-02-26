let mapNamesCache = null;
let mapNamesPromise = null;

export async function loadMapNames() {
  if (mapNamesCache) return mapNamesCache;
  if (mapNamesPromise) return mapNamesPromise;

  mapNamesPromise = fetch("./data/map-index.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load map index (${res.status})`);
      }
      return res.json();
    })
    .then((json) => {
      mapNamesCache = json?.master_maps_list || {};
      return mapNamesCache;
    })
    .finally(() => {
      mapNamesPromise = null;
    });

  return mapNamesPromise;
}

