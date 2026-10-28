# Development

## Running it locally

With Node.js 22 or newer and pnpm 11.3.0 (the version pinned in `package.json`):

```sh
git clone https://github.com/Rhgx/rhgx.github.io.git
cd rhgx.github.io
pnpm install
pnpm dev
```

The repository has its own `pnpm-workspace.yaml`, so pnpm won't treat a workspace in a parent folder as its root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the Vite dev server at http://localhost:5173 with hot reload. |
| `pnpm build` | Type-checks the app and builds the site into `dist/`. |
| `pnpm preview` | Serves the last build in `dist/`. |

## Layout

- `src/data/projects.ts` lists every card and every archived project. Most changes start here.
- `src/components/` holds the header, the search and filter controls, the cards and the section icons.
- `src/background/` holds the contour-map background. `contours.frag.glsl` is the WebGL2 fragment shader, and `ShaderBackground.tsx` runs it.
- `src/assets/previews/` holds one thumbnail per card.
- `public/` is copied into the site as it is. It holds the pages that don't have their own repository yet (`tc2-timeline`, `tc2-bingo`, `tc2-time-calc` and `region-map`), shared files in `others/`, the logo and `404.html`.
- `docs/` holds these docs, the README screenshot and the badges.

Most of my tools are separate repositories with their own GitHub Pages sites, such as `/warpaint-viewer/`. The hub only links to them.

## Adding a project

1. Add a thumbnail as `src/assets/previews/<slug>.webp` (see [Thumbnails](#thumbnails)).
2. Import it in `src/data/projects.ts` and add an entry to `projects`. I put the most used tool first in each category.
3. Set `name` to the short name for the card. Leave out the game prefix, because the section heading already shows it. Put the full name in `fullName`; it shows in the tooltip and search uses it.
4. Set `icon` only if the site has its own favicon. If the site lives in another repository, use the full `https://rhgx.github.io/...` URL so the icon also shows when running the hub locally. Add `keywords` for search terms that aren't in the name or description.

## Thumbnails

Thumbnails are 800x500 WebP images (16:10), usually 10 to 40 KB. Capture the tool in use rather than its empty start screen, and crop to the part that shows what it does. Then convert it:

```sh
magick screenshot.png -resize 800x500! -quality 82 -define webp:method=6 src/assets/previews/<slug>.webp
```

Don't show a real location or personal data. The Region Map thumbnail uses a spoofed location.

## Archiving a project

1. Move the project's folder to [Rhgx/archives](https://github.com/Rhgx/archives), and add a row to its `index.html` and README.
2. In `src/data/projects.ts`, move the entry from `projects` to `archived`, and delete its thumbnail.
3. Add the folder name to the `moved` list in `public/404.html`, so old links redirect to `/archives/<slug>/`.

A project hosted somewhere else, such as on Netlify, only needs step 2, with its address in `href`.

## Deploying

Every push to `main` runs `.github/workflows/pages.yml`. It installs with `pnpm install --frozen-lockfile`, runs `pnpm build`, and deploys `dist/` to GitHub Pages.
