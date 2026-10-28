/**
 * Roblox server regions, from the community list at
 * https://github.com/Maneetbal/roblox-server-locations (checked 2026-10-28).
 * Roblox doesn't publish its locations, so cities are estimates rounded to the nearest major city.
 *
 * Main regions run on Roblox's own network. Overflow regions are reserve capacity (mostly AWS)
 * that Roblox appears to use when a main region is full or unavailable.
 */
export const regions = [
  // North America
  { city: 'Seattle', place: 'Washington, US', area: 'North America', lat: 47.6062, lon: -122.3321 },
  { city: 'Los Angeles', place: 'California, US', area: 'North America', lat: 34.0522, lon: -118.2437 },
  { city: 'Dallas', place: 'Texas, US', area: 'North America', lat: 32.7767, lon: -96.797 },
  { city: 'Chicago', place: 'Illinois, US', area: 'North America', lat: 41.8781, lon: -87.6298 },
  { city: 'Atlanta', place: 'Georgia, US', area: 'North America', lat: 33.749, lon: -84.388 },
  { city: 'Miami', place: 'Florida, US', area: 'North America', lat: 25.7617, lon: -80.1918 },
  { city: 'Ashburn', place: 'Virginia, US', area: 'North America', lat: 39.0438, lon: -77.4874 },
  { city: 'New York City', place: 'New York, US', area: 'North America', lat: 40.7128, lon: -74.006 },
  { city: 'San Jose', place: 'California, US', area: 'North America', lat: 37.3382, lon: -121.8863, overflow: true },
  { city: 'Boardman', place: 'Oregon, US', area: 'North America', lat: 45.8399, lon: -119.7006, overflow: true },
  { city: 'Columbus', place: 'Ohio, US', area: 'North America', lat: 39.9612, lon: -82.9988, overflow: true },
  { city: 'Querétaro', place: 'Mexico', area: 'North America', lat: 20.5888, lon: -100.3899, overflow: true },

  // South America
  { city: 'São Paulo', place: 'Brazil', area: 'South America', lat: -23.5505, lon: -46.6333 },
  { city: 'Buenos Aires', place: 'Argentina', area: 'South America', lat: -34.6037, lon: -58.3816, overflow: true },
  { city: 'Santiago', place: 'Chile', area: 'South America', lat: -33.4489, lon: -70.6693, overflow: true },

  // Europe and the Middle East
  { city: 'London', place: 'United Kingdom', area: 'Europe', lat: 51.5074, lon: -0.1278 },
  { city: 'Amsterdam', place: 'Netherlands', area: 'Europe', lat: 52.3676, lon: 4.9041 },
  { city: 'Paris', place: 'France', area: 'Europe', lat: 48.8566, lon: 2.3522 },
  { city: 'Frankfurt', place: 'Germany', area: 'Europe', lat: 50.1109, lon: 8.6821 },
  { city: 'Dublin', place: 'Ireland', area: 'Europe', lat: 53.3498, lon: -6.2603, overflow: true },
  { city: 'Zurich', place: 'Switzerland', area: 'Europe', lat: 47.3769, lon: 8.5417, overflow: true },
  { city: 'Istanbul', place: 'Turkey', area: 'Europe', lat: 41.0082, lon: 28.9784, overflow: true },
  { city: 'Tel Aviv', place: 'Israel', area: 'Middle East', lat: 32.0853, lon: 34.7818, overflow: true },

  // Asia and Oceania
  { city: 'Mumbai', place: 'India', area: 'Asia', lat: 19.076, lon: 72.8777 },
  { city: 'Singapore', place: 'Singapore', area: 'Asia', lat: 1.3521, lon: 103.8198 },
  { city: 'Tokyo', place: 'Japan', area: 'Asia', lat: 35.6895, lon: 139.6917 },
  { city: 'Osaka', place: 'Japan', area: 'Asia', lat: 34.6937, lon: 135.5023, overflow: true },
  { city: 'Kuala Lumpur', place: 'Malaysia', area: 'Asia', lat: 3.139, lon: 101.6869, overflow: true },
  { city: 'Sydney', place: 'Australia', area: 'Oceania', lat: -33.8688, lon: 151.2093 },
];
