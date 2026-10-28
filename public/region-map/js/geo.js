const EARTH_RADIUS_KM = 6371;
const KM_PER_MILE = 1.609344;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometers (haversine formula). */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

const wholeNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function formatDistance(km, unit) {
  const value = unit === 'mi' ? km / KM_PER_MILE : km;
  return `${wholeNumber.format(value)} ${unit}`;
}

/** Miles for the countries that use them on road signs; kilometers everywhere else. */
export function defaultUnit() {
  try {
    const { region } = new Intl.Locale(navigator.language).maximize();
    return ['US', 'GB', 'LR', 'MM'].includes(region) ? 'mi' : 'km';
  } catch {
    return 'km';
  }
}
