import { regions } from '../data/regions.js';
import { defaultUnit, distanceKm, formatDistance } from './geo.js';

const els = {
  locate: document.getElementById('locate'),
  status: document.getElementById('status'),
  overflow: document.getElementById('overflow'),
  units: document.querySelectorAll('[data-unit]'),
  list: document.getElementById('regions'),
};

const state = {
  user: null, // { lat, lon }
  unit: defaultUnit(),
  overflow: false,
  active: null, // the region whose popup is open
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const animate = () => !reduceMotion.matches;

// Colors match styles.css.
const COLORS = { bg: '#0d0f11', region: '#c9cfd6', overflow: '#8f97a1', accent: '#f59e0b', white: '#ffffff' };
const STYLE = {
  main: { radius: 6, color: COLORS.bg, weight: 2, fillColor: COLORS.region, fillOpacity: 1 },
  overflow: { radius: 5, color: COLORS.overflow, weight: 1.5, fillColor: COLORS.bg, fillOpacity: 1 },
  closest: { radius: 7, color: COLORS.bg, weight: 2, fillColor: COLORS.accent, fillOpacity: 1 },
};

// Map

const map = L.map('map', {
  center: [25, 10],
  zoom: 2,
  minZoom: 2,
  maxZoom: 16,
  worldCopyJump: true,
  zoomSnap: 0.5,
  zoomAnimation: animate(),
  fadeAnimation: animate(),
  markerZoomAnimation: animate(),
});

L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
}).addTo(map);
map.attributionControl.addAttribution(
  'Regions from <a href="https://github.com/Maneetbal/roblox-server-locations">roblox-server-locations</a>',
);

const mainLayer = L.layerGroup().addTo(map);
const overflowLayer = L.layerGroup();
const markers = new Map();

for (const region of regions) {
  const marker = L.circleMarker([region.lat, region.lon], {
    ...(region.overflow ? STYLE.overflow : STYLE.main),
    // Clicking a region shouldn't also count as a click on the map.
    bubblingMouseEvents: false,
  });
  marker.bindPopup('', { closeButton: false, offset: [0, -4] });
  marker.on('click', () => setActive(region, false));
  marker.addTo(region.overflow ? overflowLayer : mainLayer);
  markers.set(region, marker);
}

let userMarker = null;
let closestLine = null;

// Clicking the map places you there, unless the click is only closing a popup.
let popupOpen = false;
let clickClosesPopup = false;
map.on('popupopen', () => (popupOpen = true));
map.on('popupclose', (e) => {
  popupOpen = false;
  // Opening another region's popup closes this one first, so only clear the region it belonged to.
  if (state.active && markers.get(state.active).getPopup() === e.popup) {
    state.active = null;
    renderList();
  }
});
map.on('preclick', () => (clickClosesPopup = popupOpen));
map.on('click', (e) => {
  if (clickClosesPopup) return;
  const { lat, lng } = e.latlng.wrap();
  setUser(lat, lng, false);
});

// Data

function ranked() {
  const { user } = state;
  const rows = regions
    .filter((region) => state.overflow || !region.overflow)
    .map((region) => ({ region, km: user ? distanceKm(user.lat, user.lon, region.lat, region.lon) : null }));
  if (user) rows.sort((a, b) => a.km - b.km);
  return rows;
}

// Rendering

function setStatus(text, isError = false) {
  els.status.hidden = !text;
  els.status.textContent = text;
  els.status.classList.toggle('is-error', isError);
}

function renderList() {
  const items = [];
  let area = null;

  ranked().forEach(({ region, km }, index) => {
    // Without a location the list is grouped by area instead of ranked.
    if (km === null && region.area !== area) {
      area = region.area;
      items.push(`<li class="group">${area}</li>`);
    }
    const classes = ['region'];
    if (region.overflow) classes.push('is-overflow');
    if (km !== null && index === 0) classes.push('is-closest');
    if (region === state.active) classes.push('is-active');

    items.push(`
      <li>
        <button type="button" class="${classes.join(' ')}" data-index="${regions.indexOf(region)}">
          ${km !== null ? `<span class="rank mono">${index + 1}</span>` : ''}
          <span class="city">${region.city}</span>
          ${km !== null ? `<span class="dist mono">${formatDistance(km, state.unit)}</span>` : ''}
        </button>
      </li>`);

    markers
      .get(region)
      .setPopupContent(`<b>${region.city}</b>${km !== null ? `<span class="mono">${formatDistance(km, state.unit)}</span>` : ''}`);
  });

  els.list.innerHTML = items.join('');
}

function renderMap() {
  const closest = state.user ? ranked()[0].region : null;

  for (const [region, marker] of markers) {
    marker.setStyle(region === closest ? STYLE.closest : region.overflow ? STYLE.overflow : STYLE.main);
  }
  if (closest) markers.get(closest).bringToFront();

  closestLine?.remove();
  closestLine = null;
  if (closest) {
    // Take the short way around when the closest region is across the date line.
    let lon = closest.lon;
    if (lon - state.user.lon > 180) lon -= 360;
    if (lon - state.user.lon < -180) lon += 360;
    closestLine = L.polyline(
      [
        [state.user.lat, state.user.lon],
        [closest.lat, lon],
      ],
      { color: COLORS.accent, weight: 1.5, opacity: 0.8, dashArray: '4 6', interactive: false },
    ).addTo(map);
  }
  userMarker?.bringToFront();
}

function render() {
  renderList();
  renderMap();
}

// Actions

function setUser(lat, lon, fromDevice) {
  state.user = { lat, lon };
  setStatus('');

  if (!userMarker) {
    userMarker = L.circleMarker([lat, lon], {
      radius: 8,
      color: COLORS.white,
      weight: 2,
      fillColor: COLORS.accent,
      fillOpacity: 1,
      bubblingMouseEvents: false,
    })
      .bindTooltip('You', { direction: 'top', offset: [0, -8] })
      .addTo(map);
  } else {
    userMarker.setLatLng([lat, lon]);
  }

  map.closePopup();
  render();

  // A located device gets a view of itself and its closest regions. A map click keeps the current view.
  if (fromDevice) {
    const nearby = ranked()
      .slice(0, 3)
      .map(({ region }) => [region.lat, region.lon]);
    map.fitBounds(L.latLngBounds([[lat, lon], ...nearby]), { padding: [48, 48], maxZoom: 6, animate: animate() });
  }
}

function setActive(region, moveMap) {
  state.active = region;
  renderList();
  const row = els.list.querySelector(`[data-index="${regions.indexOf(region)}"]`);
  row?.scrollIntoView({ block: 'nearest', behavior: animate() ? 'smooth' : 'auto' });

  const marker = markers.get(region);
  if (moveMap) {
    const zoom = Math.max(map.getZoom(), 4);
    if (animate()) map.flyTo(marker.getLatLng(), zoom, { duration: 0.6 });
    else map.setView(marker.getLatLng(), zoom, { animate: false });
  }
  marker.openPopup();
}

function locate() {
  if (!('geolocation' in navigator)) {
    setStatus("This browser can't share its location. Click the map instead.", true);
    return;
  }
  setStatus('Finding your location…');
  els.locate.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      els.locate.disabled = false;
      setUser(position.coords.latitude, position.coords.longitude, true);
    },
    (error) => {
      els.locate.disabled = false;
      setStatus(
        error.code === error.PERMISSION_DENIED
          ? 'Location access is blocked. Click the map instead.'
          : "Couldn't get your location. Click the map instead.",
        true,
      );
    },
    { maximumAge: 10 * 60 * 1000, timeout: 15000 },
  );
}

// Events

els.locate.addEventListener('click', locate);

els.list.addEventListener('click', (e) => {
  const button = e.target instanceof Element ? e.target.closest('button[data-index]') : null;
  if (button) setActive(regions[Number(button.dataset.index)], true);
});

els.overflow.addEventListener('change', () => {
  state.overflow = els.overflow.checked;
  if (state.overflow) overflowLayer.addTo(map);
  else overflowLayer.remove();
  if (state.active?.overflow && !state.overflow) map.closePopup();
  render();
});

function renderUnits() {
  for (const button of els.units) button.setAttribute('aria-pressed', String(button.dataset.unit === state.unit));
}
for (const button of els.units) {
  button.addEventListener('click', () => {
    state.unit = button.dataset.unit;
    renderUnits();
    renderList();
  });
}

// Start

renderUnits();
render();

// If location access was already granted on an earlier visit, skip the button.
// Browsers that can't answer the query just keep showing it.
navigator.permissions
  ?.query({ name: 'geolocation' })
  .then((permission) => {
    if (permission.state === 'granted') locate();
  })
  .catch((error) => console.info('Could not check the location permission:', error));
