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
- `scripts/get-map-data.py`: refresh the map list and mode lookup
- `scripts/get-maps.py`: rebuild `data/map-index.json`
- `scripts/get-map-modes.py`: rebuild `data/map-modes.json`
- `scripts/fetcher.js`: Steam console fetch script copied from help modal

## Runtime

No build step required. Serve the repository as static files and open `index.html`.

## Refreshing Map Data

The combined map-data script rebuilds both `data/map-index.json` and
`data/map-modes.json`. It requires Python 3.10 or newer, a local Team Fortress 2
installation, and the mode scraper's Python packages:

```sh
python -m pip install requests beautifulsoup4 lxml
```

From the repository root, run:

```sh
python scripts/get-map-data.py
```

The map-list step reads TF2's local `items_game.txt`; the mode step fetches the
TF2 Wiki's map list. The script searches the usual Steam installation and
library locations on Windows, Linux, and macOS. If TF2 cannot be found
automatically, pass the file path explicitly:

```sh
python scripts/get-map-data.py --input "/path/to/Team Fortress 2/tf/scripts/items/items_game.txt"
```

Alternatively, set `TF2_ITEMS_GAME_PATH` to either `items_game.txt` or its
containing directory before running the script. Custom output paths can be set
independently:

```sh
python scripts/get-map-data.py --maps-output /path/to/map-index.json --modes-output /path/to/map-modes.json
```

The individual `get-maps.py` and `get-map-modes.py` scripts remain available
when only one dataset needs to be refreshed.
