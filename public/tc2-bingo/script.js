const prompts = [
  'Player using {WeaponTest}',
  'Tryhard',
  'Toxic player',
  'Weird usename',
  'Team Deathmatch',
  'Doctor drops supercharge',
  'No teleporter entrance',
  'Sentry Nest',
  'Player taunting after kill',
  'Funny Ragdoll',
  '{UsernameFlair} in username',
  'Stalemate',
  'No item drops',
  'Capture the flag',
  'Paint can drop',
  'Argument in chat',
  'Face-stab',
  '{Issue} player',
  'Overused item name',
  'W+M1 Arsonist',
  'Obvious Agent',
  'Taunt kill',
  'AFK',
  'Autobalance',
  '{KillType} kill',
  'Unique {RarityWeapons}',
  'Player wearing the Gibus',
  'Player using shotgun {SClass}',
  'Player opening crate',
  'Votekick',
  'Smurf Account',
  'Mass {massType}',
  '{RageType}',
  'Player using weapon reskin',
  '{ksNumber} Killstreak',
];

const replacements = {
  '{WeaponTest}': ['Colbat', 'Direct Hit', 'Gutbuster', 'Bikers Blitz', 'Spy Camera', 'Mercy Kill', 'Einsteinium', 'Efficient Eliminator', 'Phlogistinator', 'Kunai', 'Sticky Jumper', 'Witches Brew'],
  '{UsernameFlair}': ['"TC2"', '"YT"'],
  '{Issue}': ['3000 ping', 'Console', 'Potato PC'],
  '{KillType}': ['Wooden Sword', 'Stomp', 'Lemoblade', 'Improvised Innovator', 'Fists of Steel', 'Gravity Coil'],
  '{RarityWeapons}': ['Mule Mauler', 'Diggity Dog', 'Named Item'],
  '{SClass}': ['Brute', 'Trooper'],
  '{massType}': ['map pick', 'killbind'],
  '{RageType}': ['Rage-quit', 'Rage-switch'],
  '{ksNumber}': ['5', '10', '15', '20'],
};

// Same blurred map shots as the Loadout Generator, shared in /others/backgrounds. One per visit.
const backgrounds = [
  '3cp_citrus', 'ad_cliffhanger', 'ad_deadfall_ridge', 'ad_gorge',
  'ad_yellowvalley', 'ctf_doublefort', 'koth_bagel', 'koth_harvest', 'tr_target',
];

const size = 5;
const freeIndex = 12;
const storageKey = 'bingoState';

// Every row, column and both diagonals, as cell indexes.
const lines = [
  ...Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => row * size + col)),
  ...Array.from({ length: size }, (_, col) => Array.from({ length: size }, (_, row) => row * size + col)),
  Array.from({ length: size }, (_, i) => i * size + i),
  Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)),
];

const card = document.getElementById('bingo-card');
const overlay = document.getElementById('overlay');
const winCounter = document.getElementById('win-counter');
const replayButton = document.getElementById('replay-button');

// Wins only count for this visit, as before.
let winCount = 0;
let locked = false;

const pick = (items) => items[Math.floor(Math.random() * items.length)];

// Each placeholder is picked fresh per card, so new cards get new variants.
const fillPrompt = (template) => template.replace(/\{\w+\}/g, (token) => (replacements[token] ? pick(replacements[token]) : token));

// Fisher-Yates; sorting by a random comparator is biased.
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function newCardState() {
  const picked = shuffled(prompts).slice(0, size * size - 1).map(fillPrompt);
  picked.splice(freeIndex, 0, 'Free Space');
  return picked.map((text) => ({ text, crossed: false }));
}

// Same shape the old page saved ({ text, crossed }[25]), so a card in progress survives the redesign.
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    const valid = Array.isArray(saved) && saved.length === size * size
      && saved.every((cell) => typeof cell?.text === 'string' && typeof cell?.crossed === 'boolean');
    return valid ? saved : null;
  } catch {
    return null;
  }
}

function saveState() {
  const state = [...card.children].map((cell) => ({
    text: cell.textContent,
    crossed: cell.getAttribute('aria-pressed') === 'true',
  }));
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function renderCard(state) {
  locked = false;
  overlay.hidden = true;
  card.replaceChildren(...state.map((entry, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.classList.toggle('is-free', index === freeIndex);
    cell.setAttribute('aria-pressed', String(entry.crossed));
    // Cards deal in from the middle outward.
    const distance = Math.abs(Math.floor(index / size) - 2) + Math.abs((index % size) - 2);
    cell.style.setProperty('--delay', `${distance * 40}ms`);
    const text = document.createElement('span');
    text.className = 'cell-text';
    text.textContent = entry.text;
    cell.append(text);
    cell.addEventListener('click', () => toggleCell(cell));
    return cell;
  }));
}

function toggleCell(cell) {
  if (locked) return;
  cell.setAttribute('aria-pressed', String(cell.getAttribute('aria-pressed') !== 'true'));
  saveState();
  checkForBingo(true);
}

// celebrate is false when restoring a saved card, so reloading a won card does not count it again.
function checkForBingo(celebrate) {
  const cells = [...card.children];
  const finished = lines.filter((line) => line.every((index) => cells[index].getAttribute('aria-pressed') === 'true'));
  if (finished.length === 0) return;

  finished.forEach((line) => line.forEach((index, step) => {
    cells[index].classList.add('is-complete');
    cells[index].style.setProperty('--delay', `${step * 70}ms`);
  }));
  locked = true;
  for (const cell of cells) cell.disabled = true;
  overlay.hidden = false;
  replayButton.focus({ preventScroll: true });

  if (!celebrate) return;
  winCount++;
  winCounter.textContent = String(winCount);
  burstConfetti();
}

function burstConfetti() {
  if (typeof confetti !== 'function') return;
  const duration = 3000;
  const end = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100, disableForReducedMotion: true };
  const randomInRange = (min, max) => Math.random() * (max - min) + min;
  const interval = setInterval(() => {
    const timeLeft = end - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }
    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
}

function startNewCard() {
  const state = newCardState();
  renderCard(state);
  saveState();
}

const background = pick(backgrounds);
document.body.style.setProperty('--background', `url('/others/backgrounds/${background}.webp')`);

document.getElementById('new-card').addEventListener('click', startNewCard);
replayButton.addEventListener('click', startNewCard);

const saved = loadState();
if (saved) {
  renderCard(saved);
  checkForBingo(false);
} else {
  startNewCard();
}
startGridBackground(document.getElementById('grid-background'));
