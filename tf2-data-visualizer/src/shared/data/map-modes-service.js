let mapModesCache = null;
let mapModesPromise = null;

/**
 * Loads data/map-modes.json — a flat map of filename → mode key
 * produced by scripts/get-map-modes.py.
 *
 * Returns an empty object (with no throws) when the file is absent so the
 * app degrades gracefully to prefix-only mode detection.
 */
export async function loadMapModes() {
  if (mapModesCache) return mapModesCache;
  if (mapModesPromise) return mapModesPromise;

  mapModesPromise = fetch("./data/map-modes.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`map-modes.json not found (${res.status})`);
      return res.json();
    })
    .then((json) => {
      mapModesCache = json?.map_modes || {};
      return mapModesCache;
    })
    .catch(() => {
      mapModesCache = {};
      return mapModesCache;
    })
    .finally(() => {
      mapModesPromise = null;
    });

  return mapModesPromise;
}
