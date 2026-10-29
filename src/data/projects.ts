import tc2dle from '../assets/previews/tc2dle.webp';
import tc2Timeline from '../assets/previews/tc2-timeline.webp';
import tc2ItemDropEditor from '../assets/previews/tc2-item-drop-editor.webp';
import tc2LoadoutGenerator from '../assets/previews/tc2-loadout-generator.webp';
import tc2TierlistMaker from '../assets/previews/tc2-tierlist-maker.webp';
import tc2Bingo from '../assets/previews/tc2-bingo.webp';
import tc2TimeCalc from '../assets/previews/tc2-time-calc.webp';
import warpaintViewer from '../assets/previews/warpaint-viewer.webp';
import tf2DataVisualizer from '../assets/previews/tf2-data-visualizer.webp';
import tf2WorkshopBingo from '../assets/previews/tf2-workshop-bingo.webp';
import tf2MotdTester from '../assets/previews/tf2-motd-tester.webp';
import regionMap from '../assets/previews/region-map.webp';
import gradientGen from '../assets/previews/gradient-gen.webp';
import rbxlxScriptExporter from '../assets/previews/rbxlx-script-exporter.webp';
import libreConvert from '../assets/previews/libre-convert.webp';
import timestampConverter from '../assets/previews/timestamp-converter.webp';
import znake from '../assets/previews/znake.webp';

export type Category = 'tc2' | 'tf2' | 'roblox' | 'other';

export const categories: { id: Category; label: string; short: string }[] = [
  { id: 'tc2', label: 'Typical Colors 2', short: 'TC2' },
  { id: 'tf2', label: 'Team Fortress 2', short: 'TF2' },
  { id: 'roblox', label: 'Roblox', short: 'Roblox' },
  { id: 'other', label: 'Other', short: 'Other' },
];

export interface Project {
  /** Shown on the card. Drops the game prefix since the section heading already says it. */
  name: string;
  /** Used for the tooltip and search. */
  fullName: string;
  description: string;
  category: Category;
  href: string;
  preview: string;
  /**
   * The site's own favicon, when it has one. Icons from sites in other repositories use the
   * full URL, because a local dev server only serves this repository's files.
   */
  icon?: string;
  /** Extra search terms that are not in the name or description. */
  keywords?: string;
}

export interface ArchivedProject {
  name: string;
  slug: string;
  keywords?: string;
  /** For projects hosted elsewhere; otherwise the link is /archives/<slug>/. */
  href?: string;
}

// Within each category the most used tool goes first.
export const projects: Project[] = [
  {
    name: 'TC2DLE',
    fullName: 'TC2DLE',
    description: 'Guess the daily Typical Colors 2 answer.',
    category: 'tc2',
    href: '/tc2dle/',
    preview: tc2dle,
    icon: '/others/tc2-icon.png',
    keywords: 'wordle daily guess',
  },
  {
    name: 'Update Timeline',
    fullName: 'TC2 Update Timeline',
    description: 'Every TC2 update, in order, with images.',
    category: 'tc2',
    href: '/tc2-timeline/',
    preview: tc2Timeline,
    icon: '/tc2-timeline/favicon.svg',
    keywords: 'updates history patch',
  },
  {
    name: 'Item Drop Editor',
    fullName: 'TC2 Item Drop Editor',
    description: 'Build and edit item drop announcements.',
    category: 'tc2',
    href: '/tc2-item-drop-editor/',
    preview: tc2ItemDropEditor,
    keywords: 'unbox found an item',
  },
  {
    name: 'Loadout Generator',
    fullName: 'TC2 Random Loadout Generator',
    description: 'Roll a random class and loadout to play.',
    category: 'tc2',
    href: '/tc2-loadout-generator/',
    preview: tc2LoadoutGenerator,
    keywords: 'random class weapons',
  },
  {
    name: 'Tierlist Maker',
    fullName: 'TC2 Tierlist Maker',
    description: 'Rank weapons, maps, cosmetics and taunts.',
    category: 'tc2',
    href: '/tc2-tierlist-maker/',
    preview: tc2TierlistMaker,
    keywords: 'tier list ranking',
  },
  {
    name: 'Bingo Card Generator',
    fullName: 'TC2 Bingo Card Generator',
    description: 'Generate bingo cards for TC2 matches.',
    category: 'tc2',
    href: '/tc2-bingo/',
    preview: tc2Bingo,
    icon: '/tc2-bingo/favicon.svg',
  },
  {
    name: 'Time Calculator',
    fullName: 'TC2 Time Calculator',
    description: 'Work out playtime and update timings.',
    category: 'tc2',
    href: '/tc2-time-calc/',
    preview: tc2TimeCalc,
    icon: '/tc2-time-calc/favicon.svg',
    keywords: 'calc hours',
  },
  {
    name: 'Warpaint Viewer',
    fullName: 'TF2 Warpaint Viewer',
    description: 'War paints rendered like the in-game compositor.',
    category: 'tf2',
    href: '/warpaint-viewer/',
    preview: warpaintViewer,
    icon: 'https://rhgx.github.io/warpaint-viewer/favicon.svg',
    keywords: 'war paint skins',
  },
  {
    name: 'Match Data Visualizer',
    fullName: 'TF2 Match Data Visualizer',
    description: 'Win rates, maps and heatmaps from your matches.',
    category: 'tf2',
    href: '/tf2-data-visualizer/',
    preview: tf2DataVisualizer,
    icon: 'https://rhgx.github.io/tf2-data-visualizer/ui/glyphs/items.png',
    keywords: 'stats gcpd match history',
  },
  {
    name: 'Workshop Bingo',
    fullName: 'TF2 Workshop Bingo',
    description: "Painter's Bingo cards from Workshop items.",
    category: 'tf2',
    href: '/tf2-workshop-bingo/',
    preview: tf2WorkshopBingo,
    keywords: 'steam workshop painter',
  },
  {
    name: 'MOTD Tester',
    fullName: 'TF2 MOTD Tester',
    description: 'Preview MOTDs in the stock HUD layout.',
    category: 'tf2',
    href: '/tf2-motd-tester/',
    preview: tf2MotdTester,
    keywords: 'message of the day server',
  },
  {
    name: 'Region Map',
    fullName: 'Roblox Region Map',
    description: 'Find the Roblox server regions closest to you.',
    category: 'roblox',
    href: '/region-map/',
    preview: regionMap,
    icon: '/region-map/favicon.svg',
    keywords: 'servers regions closest',
  },
  {
    name: 'RichText Gradient Generator',
    fullName: 'Roblox RichText Gradient Generator',
    description: 'RichText gradients with a live preview.',
    category: 'roblox',
    href: '/gradient-gen/',
    preview: gradientGen,
    keywords: 'rich text color',
  },
  {
    name: 'RBXLX Script Exporter',
    fullName: 'RBXLX Script Exporter',
    description: 'Pull every script out of a place file.',
    category: 'roblox',
    href: '/rbxlx-script-exporter/',
    preview: rbxlxScriptExporter,
    keywords: 'rbxl place lua luau',
  },
  {
    name: 'Libre Convert',
    fullName: 'Libre Convert',
    description: 'Office files and images to PDF, in the browser.',
    category: 'other',
    href: '/libre-convert/',
    preview: libreConvert,
    icon: 'https://rhgx.github.io/libre-convert/favicon.svg',
    keywords: 'pdf word excel powerpoint docx',
  },
  {
    name: 'Discord Timestamp Converter',
    fullName: 'Discord Timestamp Converter',
    description: '"tomorrow at 3pm Tokyo" to a Discord timestamp.',
    category: 'other',
    href: '/timestamp-converter/',
    preview: timestampConverter,
    icon: 'https://rhgx.github.io/timestamp-converter/favicon.svg',
    keywords: 'unix time date',
  },
  {
    name: 'Znake',
    fullName: 'Znake',
    description: 'A snake game.',
    category: 'other',
    href: '/znake/',
    preview: znake,
    keywords: 'snake game',
  },
];

// Served from the Rhgx/archives repository at /archives/<slug>/.
// Keep in sync with the redirect list in public/404.html and the archives index page.
export const archived: ArchivedProject[] = [
  { name: 'TF2 Data Visualizer (v1)', slug: 'tf2-data-visualizer-v1', keywords: 'tf2 stats old' },
  { name: 'Roblox Atlas Generator', slug: 'video-to-atlas', keywords: 'roblox video sprite sheet' },
  { name: 'Slide Puzzle', slug: 'slider' },
  { name: 'Krabs Countdown', slug: 'krabs-countdown', keywords: 'timer' },
  { name: 'Grow a Garden Update Countdown', slug: 'gag-countdown', keywords: 'roblox timer gag' },
  { name: 'TC2 Competitive Hub', slug: 'tc2-comp-hub', keywords: 'comp league' },
  { name: 'Turkey Earthquake Tracker', slug: 'turkey-earthquake-map', keywords: 'map deprem' },
  { name: 'TC2 XP Calculator', slug: 'tc2-xp-calc', keywords: 'level' },
  { name: 'TC2 Puzzle Game', slug: 'tc2-puzzle' },
  { name: 'TC2 Server Browser', slug: 'tc2-server-browser', keywords: 'servers' },
  { name: "Rock's Typical Item Shop", slug: 'rocks-item-shop', keywords: 'tc2 store' },
  // Hosted on Netlify, so it is listed here but not part of the archives repository.
  {
    name: 'Lurkr.gg Username Finder',
    slug: 'lurkr-username-finder',
    keywords: 'lurkr discord',
    href: 'https://starlit-shortbread-ca47d4.netlify.app/',
  },
];
