const classes = [
  'Flanker', 'Trooper', 'Arsonist', 'Annihilator', 'Brute',
  'Mechanic', 'Doctor', 'Marksman', 'Agent',
];
const servers = { official: 'official servers', community: 'community servers' };
const units = [
  { key: 'hours', suffix: 'h', maxLength: 5 },
  { key: 'minutes', suffix: 'm', maxLength: 2 },
  { key: 'seconds', suffix: 's', maxLength: 2 },
];
// Same blurred map shots as the Loadout Generator, shared in /others/backgrounds. One per visit.
const backgrounds = [
  '3cp_citrus', 'ad_cliffhanger', 'ad_deadfall_ridge', 'ad_gorge',
  'ad_yellowvalley', 'ctf_doublefort', 'koth_bagel', 'koth_harvest', 'tr_target',
];

const iconPath = (name) => `assets/icons/${name.toLowerCase()}.webp`;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function createClassCard(name, server) {
  const card = document.createElement('div');
  card.className = 'class-card';
  card.dataset.class = name;

  const head = document.createElement('div');
  head.className = 'class-head';
  const icon = document.createElement('img');
  icon.className = 'class-icon';
  icon.src = iconPath(name);
  icon.alt = '';
  icon.draggable = false;
  const label = document.createElement('span');
  label.textContent = name;
  head.append(icon, label);

  const fields = document.createElement('div');
  fields.className = 'time-fields';
  for (const unit of units) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    // A text field rather than type="number", which still accepts "e", "+", "-" and "."
    // (and anything at all in Firefox). Typed or pasted non-digits are dropped.
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.maxLength = unit.maxLength;
    input.placeholder = '0';
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      if (digits !== input.value) input.value = digits;
    });
    input.dataset.unit = unit.key;
    input.setAttribute('aria-label', `${name} ${unit.key}, ${servers[server]}`);
    const suffix = document.createElement('span');
    suffix.textContent = unit.suffix;
    suffix.setAttribute('aria-hidden', 'true');
    label.append(input, suffix);
    fields.append(label);
  }

  card.append(head, fields);
  return card;
}

function readSeconds(card) {
  const value = (unit) => parseInt(card.querySelector(`[data-unit="${unit}"]`).value, 10) || 0;
  return value('hours') * 3600 + value('minutes') * 60 + value('seconds');
}

function splitTime(totalSeconds) {
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function shortTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${totalSeconds % 60}s`;
}

function calculate() {
  const perClass = classes.map((name) => ({
    name,
    seconds: Object.keys(servers).reduce(
      (sum, server) => sum + readSeconds(document.querySelector(`#${server} [data-class="${name}"]`)),
      0,
    ),
  }));
  const total = perClass.reduce((sum, entry) => sum + entry.seconds, 0);
  const { days, hours, minutes, seconds } = splitTime(total);

  document.getElementById('total-hours').textContent =
    `${plural(days * 24 + hours, 'hour')} ${plural(minutes, 'minute')} ${plural(seconds, 'second')}`;
  document.getElementById('total-days-row').hidden = days === 0;
  document.getElementById('total-days').textContent =
    `${plural(days, 'day')} ${plural(hours, 'hour')} ${plural(minutes, 'minute')} ${plural(seconds, 'second')}`;

  const longest = Math.max(...perClass.map((entry) => entry.seconds));
  const bars = document.getElementById('bars');
  bars.replaceChildren(...perClass.map((entry) => {
    const row = document.createElement('li');
    row.classList.toggle('is-empty', entry.seconds === 0);
    const share = total > 0 ? Math.round((entry.seconds / total) * 100) : 0;
    const width = longest > 0 ? (entry.seconds / longest) * 100 : 0;
    row.innerHTML = `
      <img class="bar-icon" src="${iconPath(entry.name)}" alt="" draggable="false">
      <span class="bar-name">${entry.name}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width: ${width}%"></span></span>
      <span class="bar-value">${shortTime(entry.seconds)}</span>
      <span class="bar-share">${share}%</span>
    `;
    return row;
  }));

  const results = document.getElementById('results');
  const firstReveal = results.hidden;
  results.hidden = false;
  // Chromium does not tone down smooth scrolling for reduced motion on its own.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (firstReveal) results.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}

function showServer(server) {
  for (const button of document.querySelectorAll('[data-server]')) {
    button.setAttribute('aria-pressed', String(button.dataset.server === server));
  }
  for (const key of Object.keys(servers)) {
    document.getElementById(key).hidden = key !== server;
  }
}

const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
document.body.style.setProperty('--background', `url('/others/backgrounds/${background}.webp')`);

for (const server of Object.keys(servers)) {
  document.getElementById(server).append(...classes.map((name) => createClassCard(name, server)));
}
for (const button of document.querySelectorAll('[data-server]')) {
  button.addEventListener('click', () => showServer(button.dataset.server));
}
document.getElementById('calculate').addEventListener('click', calculate);
startGridBackground(document.getElementById('grid-background'));
