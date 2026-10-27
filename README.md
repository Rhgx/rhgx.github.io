# rhgx.github.io

Rocks's project hub at <https://rhgx.github.io>: browser tools for Typical Colors 2, TF2 and Roblox, plus a few other things.

Built with Vite, React and TypeScript, and deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

## Development

```sh
pnpm install
pnpm dev        # local dev server
pnpm build      # type-check and build to dist/
pnpm preview    # serve the built site
```

## Layout

| Path | What it is |
| --- | --- |
| `src/data/projects.ts` | Every project card and the archived project list. Edit this to add, reorder or archive a project. |
| `src/assets/previews/` | Card thumbnails, 800x500 WebP (16:10), one per project. |
| `src/background/` | The animated contour-map background (WebGL2 fragment shader). |
| `public/` | Copied to the site as-is. Holds older pages that are not separate repositories yet (`tc2-timeline`, `tc2-bingo`, `tc2-time-calc`, `region-map`), shared files in `others/`, the logo and `404.html`. |

Most tools live in their own repositories and are served from their own paths (for example `/warpaint-viewer/`); the hub only links to them.

## Archive

Retired projects live in [Rhgx/archives](https://github.com/Rhgx/archives) and are served at `/archives/<project>/`. `public/404.html` redirects their old links. To archive a project: move its folder to that repository, move its entry from `projects` to `archived` in `src/data/projects.ts`, and add its path to the list in `public/404.html`.

## Credits

- Made by Rocks.
- Team Fortress 2 icon: [Tf2icon.png](https://commons.wikimedia.org/wiki/File:Tf2icon.png) from Wikimedia Commons, CC BY-SA 4.0. Team Fortress 2 is a trademark of Valve.
- Roblox and GitHub marks: [Simple Icons](https://simpleicons.org/) (CC0). Roblox is a trademark of Roblox Corporation.
- Interface icons: [Lucide](https://lucide.dev/) (ISC).
- Fonts: IBM Plex Sans and IBM Plex Mono (SIL Open Font License), via Fontsource.
- Simplex noise in the background shader: Ashima Arts and Stefan Gustavson (MIT).
