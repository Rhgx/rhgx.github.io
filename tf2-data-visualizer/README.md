# TF2 Data Visualizer

Static browser app for visualizing TF2 match CSV exports.

## Project Layout

- `index.html`: static entry page
- `src/app`: app bootstrap and orchestration
- `src/features`: feature modules
  - `general/general.js`
  - `map-history/map-history.js`
  - `top-lists/top-lists.js`
- `src/shared`: shared runtime code
  - `core`: utils/config/animations
  - `csv`: parser + worker
  - `ui`: virtual table
  - `data`: map index loader service
- `styles`: stylesheet files (`main.css` is the CSS entry)
- `data/map-index.json`: map metadata source
- `scripts/get-maps.py`: rebuild `data/map-index.json`
- `scripts/fetcher.js`: Steam console fetch script copied from help modal

## Runtime

No build step required. Serve the repository as static files and open `index.html`.

