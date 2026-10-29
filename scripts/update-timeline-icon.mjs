// Saves Typical Colors 2's current Roblox game icon as the art for the newest update in
// public/tc2-timeline/data/updates.json. TC2 swaps its icon with every update, so right after
// one ships this gets the update's art straight from the game instead of a wiki copy:
//
//   node scripts/update-timeline-icon.mjs
//
// The thumbnails API only offers icon sizes up to 512x512, but the CDN link it returns serves
// the same image at 1024x1024 once its size segment is changed. The page gets Roblox's own
// WebP (public/tc2-timeline/images/updates/) and the PNG goes to the full-size archive in
// public/others/tc2-timeline/updates/.

import { readFile, writeFile } from 'node:fs/promises';

const universeId = 147332621; // Typical Colors 2, place 328028363
const updatesPath = new URL('../public/tc2-timeline/data/updates.json', import.meta.url);
const webpFolder = new URL('../public/tc2-timeline/images/updates/', import.meta.url);
const pngFolder = new URL('../public/others/tc2-timeline/updates/', import.meta.url);

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function download(url, expectedType) {
  const response = await fetch(url);
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.toLowerCase().startsWith(expectedType)) {
    throw new Error(`Could not download ${url}: HTTP ${response.status}, ${type || 'no content type'}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const updates = JSON.parse(await readFile(updatesPath, 'utf8'));
const latest = updates.reduce((newest, update) => (update.date > newest.date ? update : newest));
// Keep an existing file name so the archive and the page stay paired; otherwise "2026-06-just-enough-slots".
const baseName = latest.logo ? latest.logo.replace(/\.[a-z]+$/i, '') : `${latest.date.slice(0, 7)}-${slug(latest.name)}`;

const api = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`;
const response = await fetch(api);
if (!response.ok) throw new Error(`Thumbnails API: HTTP ${response.status}`);
const [icon] = (await response.json()).data ?? [];
if (icon?.state !== 'Completed' || !icon.imageUrl?.includes('/512/512/Image/Png/')) {
  throw new Error(`Unexpected icon response: ${JSON.stringify(icon)}`);
}
const fullSize = (format) => icon.imageUrl.replace('/512/512/Image/Png/', `/1024/1024/Image/${format}/`);

const webp = await download(fullSize('Webp'), 'image/webp');
const png = await download(fullSize('Png'), 'image/png');
await writeFile(new URL(`${baseName}.webp`, webpFolder), webp);
await writeFile(new URL(`${baseName}.png`, pngFolder), png);

if (latest.logo !== `${baseName}.webp`) {
  latest.logo = `${baseName}.webp`;
  // Same layout as the hand-written file: one update per line.
  const lines = updates.map((update) => `  { "date": ${JSON.stringify(update.date)}, "name": ${JSON.stringify(update.name)}, "logo": ${JSON.stringify(update.logo)} }`);
  await writeFile(updatesPath, `[\n${lines.join(',\n')}\n]\n`);
}

console.log(`Saved the current game icon as the art for ${latest.name} (${latest.date}):`);
console.log(`  public/tc2-timeline/images/updates/${baseName}.webp (${(webp.length / 1024).toFixed(0)} KB)`);
console.log(`  public/others/tc2-timeline/updates/${baseName}.png (${(png.length / 1024).toFixed(0)} KB)`);
console.log('TC2 also changes its icon for events, so check it is the right picture.');
