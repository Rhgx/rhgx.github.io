const imageBase = 'images/updates/';

const timeline = document.getElementById('timeline');
const dayMs = 24 * 60 * 60 * 1000;
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Dates are calendar days, not instants. new Date('2021-12-24') is midnight UTC, which is
// still the 23rd in the Americas, so dates are kept as plain year/month/day instead.
function parseDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day, serial: Date.UTC(year, month - 1, day) / dayMs };
}

function today() {
  const now = new Date();
  return parseDate(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
}

const plural = (count, word) => `${count.toLocaleString('en')} ${word}${count === 1 ? '' : 's'}`;
const daysBetween = (from, to) => to.serial - from.serial;

function ordinal(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  return `${day}${{ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th'}`;
}

const formatDate = (date) => `${ordinal(date.day)} of ${monthNames[date.month - 1]}, ${date.year}`;

// Whole calendar months from one date to a later one.
function monthsBetween(from, to) {
  const months = (to.year - from.year) * 12 + (to.month - from.month);
  return to.day < from.day ? months - 1 : months;
}

// "2 years, 3 months", "4 months" or "6 days".
function duration(from, to) {
  const months = monthsBetween(from, to);
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest ? `${plural(years, 'year')}, ${plural(rest, 'month')}` : plural(years, 'year');
  }
  if (months >= 1) return plural(months, 'month');
  return plural(daysBetween(from, to), 'day');
}

function daysAgo(date, now) {
  const days = daysBetween(date, now);
  if (days < 0) return `in ${plural(-days, 'day')}`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${plural(days, 'day')} ago`;
}

// Cards round older updates to years and months ("3 years, 10 months ago"); the exact day
// count is still shown on hover and in the popup.
function cardAgo(date, now) {
  const days = daysBetween(date, now);
  if (days < 0 || monthsBetween(date, now) < 1) return daysAgo(date, now);
  return `${duration(date, now)} ago`;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const formatDay = (date) => `${ordinal(date.day)} of ${monthNames[date.month - 1]}`;

function yearsAgo(year, now) {
  const years = now.year - year;
  if (years <= 0) return 'This year';
  if (years === 1) return 'Last year';
  return `${years} years ago`;
}

// The latest update counts exact days ("131 days ago"); older ones round to years and months.
const agoText = (update, now, isLatest) => (isLatest ? daysAgo(update.date, now) : cardAgo(update.date, now));

function createCard(update, now, isLatest) {
  const card = element('article', `card${isLatest ? ' is-latest' : ''}`);
  if (isLatest) card.append(element('p', 'update-tag', 'Latest update'));
  // The name is a button stretched over the whole card, so anywhere on it opens the popup.
  const heading = element('h3', 'update-name');
  const open = element('button', 'card-open', update.name);
  open.type = 'button';
  open.setAttribute('aria-haspopup', 'dialog');
  open.addEventListener('click', () => openModal(update));
  heading.append(open);
  card.append(heading);

  const when = element('p', 'card-when');
  const date = element('time', '', formatDate(update.date));
  date.dateTime = update.iso;
  when.append(date, element('span', 'stat-value', ` · ${agoText(update, now, isLatest)}`));
  when.title = daysAgo(update.date, now);
  card.append(when);

  if (update.logo) {
    const art = element('div', 'art');
    const image = element('img');
    image.src = imageBase + update.logo;
    image.alt = '';
    // Most art is square; the few banners settle to their own height once loaded.
    image.width = 640;
    image.height = 640;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.draggable = false;
    art.append(image);
    card.append(art);
  }
  return card;
}

// The date on the far side of the rail, opposite the card (desktop only).
function createWhen(update, now, isLatest) {
  const when = element('div', 'when');
  when.setAttribute('aria-hidden', 'true');
  when.title = daysAgo(update.date, now);
  when.append(element('p', 'when-date', formatDay(update.date)), element('p', 'stat-value', agoText(update, now, isLatest)));
  return when;
}

// Popup

const modal = document.getElementById('modal');
const wikiBase = 'https://typicalcolors2.fandom.com/wiki/';
// Each kind of addition shows at most this many names ("Maps: Pineway, Dusk, Twilight and 1 more").
const shownItems = 3;
let wiki = {};

const wikiUrl = (title) => wikiBase + encodeURIComponent(title.replaceAll(' ', '_'));

// Wiki headings are title case ("Tweaked Weapons"); this reads them as a sentence,
// "Tweaked weapons, new weapon models and patches.", keeping acronyms like "HUD".
function sentenceList(labels) {
  const words = labels.map((label) => label.split(' ').map((word) => (/^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word)).join(' '));
  const list = words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
  return `${list.charAt(0).toUpperCase()}${list.slice(1)}.`;
}

// "a, b and c", or "a, b, c and 4 more" past the limit.
function nameList(items) {
  const shown = items.slice(0, shownItems);
  const more = items.length - shown.length;
  if (more > 0) return `${shown.join(', ')} and ${more} more`;
  return shown.length < 2 ? shown.join('') : `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
}

function openModal(update) {
  const info = wiki[update.name];

  const icon = document.getElementById('modal-icon');
  icon.hidden = !update.logo;
  if (update.logo) icon.src = imageBase + update.logo;
  document.getElementById('modal-date').textContent = formatDate(update.date);
  document.getElementById('modal-title').textContent = update.name;

  // The wiki opens with "X is a major update released on <date>", which the bar already says,
  // so those sentences are dropped. "Also known as" ones stay: they explain names like Homer.
  const [opening = '', changes = ''] = info?.summary ?? [];
  const kept = opening.split(/(?<=\.)\s+/).filter((sentence) => !/released on/i.test(sentence) || /also known as/i.test(sentence));
  const summary = document.getElementById('modal-summary');
  summary.textContent = [...kept, changes].join(' ').trim();
  summary.hidden = !summary.textContent;

  const features = info?.features ?? [];
  document.getElementById('modal-features').hidden = features.length === 0;
  document.getElementById('modal-feature-list').replaceChildren(...features.map((feature) => {
    const row = element('li');
    row.append(element('span', 'feature-label', `${feature.label}: `), nameList(feature.items));
    return row;
  }));

  const also = document.getElementById('modal-also');
  also.hidden = !info?.also?.length;
  if (info?.also?.length) also.replaceChildren(element('span', 'modal-also-label', 'Also: '), sentenceList(info.also));

  document.getElementById('modal-wiki').href = info?.url ?? wikiUrl(update.name);
  modal.querySelector('.modal-body').scrollTop = 0;
  modal.showModal();
}

document.getElementById('modal-close').addEventListener('click', () => modal.close());
// A click on the backdrop lands on the dialog itself, outside its content.
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.close();
});

const gapLabel = (from, to, order) => `${duration(from, to)} ${order === 'newest' ? 'earlier' : 'later'}`;

let observer = null;

function render(updates, order) {
  const now = today();
  const released = updates.filter((update) => daysBetween(update.date, now) >= 0);
  const latest = released[released.length - 1];
  const list = order === 'newest' ? [...updates].reverse() : updates;

  // Group into years, keeping the chosen order.
  const years = [];
  for (const update of list) {
    const last = years[years.length - 1];
    if (last && last.year === update.date.year) last.updates.push(update);
    else years.push({ year: update.date.year, updates: [update] });
  }

  const between = (earlier, later) => (order === 'newest' ? [later.date, earlier.date] : [earlier.date, later.date]);
  const nodes = [];
  let side = 0;
  years.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      const previous = years[groupIndex - 1].updates.at(-1);
      const bridge = element('div', 'year-gap');
      bridge.append(element('span', '', gapLabel(...between(previous, group.updates[0]), order)));
      nodes.push(bridge);
    }

    const section = element('section', 'year');
    section.setAttribute('aria-label', String(group.year));
    const label = element('h2', 'year-label');
    const box = element('span', 'year-box');
    box.append(element('span', 'game-text', String(group.year)), element('span', 'stat-value', yearsAgo(group.year, now)));
    label.append(box);

    const items = element('ol', 'updates');
    group.updates.forEach((update, index) => {
      if (index > 0) {
        const gap = element('li', 'gap');
        gap.append(element('span', '', gapLabel(...between(group.updates[index - 1], update), order)));
        items.append(gap);
      }
      // Sides keep alternating across years so neighbours never land on the same side.
      const item = element('li', `update ${side++ % 2 ? 'is-right' : 'is-left'}`);
      item.append(createCard(update, now, update === latest), createWhen(update, now, update === latest));
      items.append(item);
    });

    section.append(label, items);
    nodes.push(section);
  });
  timeline.replaceChildren(...nodes);

  // Cards fade in once as they scroll into view, and then stay.
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.1 });
  for (const card of timeline.querySelectorAll('.card')) observer.observe(card);
}

async function init() {
  // The wiki text is optional: without it the popup still shows the date, art and wiki link.
  const wikiRequest = fetch('data/wiki.json')
    .then((response) => (response.ok ? response.json() : {}))
    .then((data) => (data && typeof data === 'object' ? data : {}))
    .catch(() => ({}));

  let updates;
  try {
    const response = await fetch('data/updates.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Expected a list of updates');
    const text = (value) => (typeof value === 'string' ? value : '');
    updates = data
      .filter((entry) => typeof entry?.name === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry?.date ?? ''))
      .map((entry) => ({ name: entry.name, iso: entry.date, date: parseDate(entry.date), logo: text(entry.logo) }))
      .sort((a, b) => a.date.serial - b.date.serial);
    wiki = await wikiRequest;
  } catch (error) {
    console.error('Failed to load the timeline:', error);
    timeline.replaceChildren(element('p', 'timeline-error', 'The timeline could not be loaded. Refresh the page to try again.'));
    return;
  }

  let order = 'newest';
  render(updates, order);

  for (const button of document.querySelectorAll('[data-order]')) {
    button.addEventListener('click', () => {
      if (button.dataset.order === order) return;
      order = button.dataset.order;
      for (const other of document.querySelectorAll('[data-order]')) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      render(updates, order);
    });
  }
}

init();
