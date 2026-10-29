// Pulls a short summary of every update on the TC2 Timeline from the Typical Colors 2 Wiki
// (typicalcolors2.fandom.com) into public/tc2-timeline/data/wiki.json, which the page shows
// in its update popup. Update names match their wiki page titles, which is also what the
// wiki calls them. Run it after adding an update to public/tc2-timeline/data/updates.json:
//
//   node scripts/update-timeline-wiki.mjs
//
// The page reads the saved file instead of calling Fandom from the browser, so it stays
// fast and keeps working if the wiki is slow, down or changes its API. Wiki text is
// CC BY-SA 3.0; the popup credits and links the source page.

import { readFile, writeFile } from 'node:fs/promises';

const api = 'https://typicalcolors2.fandom.com/api.php';
const wikiBase = 'https://typicalcolors2.fandom.com/wiki/';
const updatesPath = new URL('../public/tc2-timeline/data/updates.json', import.meta.url);
const outputPath = new URL('../public/tc2-timeline/data/wiki.json', import.meta.url);
// Fandom rejects requests without a browser-like user agent.
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

const classes = new Set(['Classes', 'All Classes', 'Flanker', 'Trooper', 'Arsonist', 'Annihilator', 'Brute', 'Mechanic', 'Doctor', 'Marksman', 'Agent']);
// Sections under "Additions" that list changes rather than new things; they become "Also".
const changeSections = /^(tweaked|new .*models?|patches|undocumented|changes|removals?|balance)/i;

const pageUrl = (title) => wikiBase + encodeURIComponent(title.replaceAll(' ', '_')).replaceAll('%2F', '/');

async function fetchWikitext(title) {
  const url = `${api}?action=parse&format=json&redirects=1&prop=wikitext&page=${encodeURIComponent(title)}`;
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`${title}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`${title}: ${data.error.info}`);
  return data.parse.wikitext['*'].replace(/\r/g, '');
}

// Finds the end of a balanced [[...]] or {{...}} starting at `start`.
function balancedEnd(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text.startsWith(open, i)) { depth++; i++; }
    else if (text.startsWith(close, i)) { depth--; i++; if (depth === 0) return i + 1; }
  }
  return text.length;
}

// Replaces every balanced {{template}} or [[File:...]] with what `replace` returns.
function replaceBalanced(text, open, close, replace) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith(open, i)) {
      const end = balancedEnd(text, i, open, close);
      result += replace(text.slice(i + open.length, end - close.length));
      i = end;
    } else {
      result += text[i++];
    }
  }
  return result;
}

const templateArgs = (inner) => inner.split('|').map((part) => part.trim());

// Wikitext to plain text: keeps link labels and Roblox usernames, drops files, refs and markup.
function plain(wikitext) {
  let text = wikitext.replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '');
  text = replaceBalanced(text, '{{', '}}', (inner) => {
    const [name, first] = templateArgs(inner);
    return /^rblxuser$/i.test(name) ? first ?? '' : '';
  });
  text = replaceBalanced(text, '[[', ']]', (inner) => {
    if (/^(file|image|category):/i.test(inner)) return '';
    const parts = inner.split('|');
    return parts[parts.length - 1].replace(/^:/, '');
  });
  return text
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function summarize(title, wikitext) {
  const [intro] = wikitext.split(/^==/m);

  let quote = null;
  replaceBalanced(intro, '{{', '}}', (inner) => {
    const [name, text, source] = templateArgs(inner);
    if (!quote && /^quote$/i.test(name) && text) quote = { text: plain(text), source: source ? plain(source) : '' };
    return '';
  });

  const summary = plain(intro)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0)
    .slice(0, 2);

  // Level 3 sections under "Additions", e.g. "=== Weapons ===".
  const features = [];
  const also = [];
  const additions = wikitext.split(/^==\s*Additions\s*==\s*$/m)[1]?.split(/^==[^=]/m)[0] ?? '';
  const parts = additions.split(/^===\s*([^=].*?)\s*===\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const label = plain(parts[i]);
    const body = parts[i + 1];
    if (changeSections.test(label)) {
      also.push(label);
      continue;
    }
    // Every listed thing has an image linking to its page; class icons are skipped.
    const items = [...new Set([...body.matchAll(/\[\[(?:File|Image):[^\]]*?\|link=([^|\]]+)/gi)]
      .map((match) => match[1].trim())
      .filter((item) => item && !classes.has(item)))];
    if (items.length > 0) features.push({ label, items });
    else also.push(label);
  }

  return { url: pageUrl(title), quote, summary, features, also };
}

const updates = JSON.parse(await readFile(updatesPath, 'utf8'));
const output = {};
for (const update of updates) {
  const wikitext = await fetchWikitext(update.name);
  output[update.name] = summarize(update.name, wikitext);
  const entry = output[update.name];
  console.log(`${update.name}: ${entry.summary.length} paragraphs, ${entry.features.map((f) => `${f.label} ${f.items.length}`).join(', ') || 'no item lists'}`);
}
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${Object.keys(output).length} updates to ${outputPath.pathname}`);
