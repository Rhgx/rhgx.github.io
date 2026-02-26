# Architecture

## Overview

The app is a static ES-module frontend with one controller orchestrating three
feature modules. CSV parsing runs in a dedicated Web Worker.

## Data Flow

1. User uploads/pastes CSV in `src/app/app-controller.js`.
2. `src/shared/csv/parser.js` parses rows via `src/shared/csv/csv.worker.js`.
3. Parsed rows are fanned out to:
   - `init/load/reset` in `src/features/general/general.js`
   - `init/load/reset` in `src/features/map-history/map-history.js`
   - `init/load/reset` in `src/features/top-lists/top-lists.js`
4. Feature modules render charts/tables and update their own UI state.

## Shared Services

- `src/shared/data/map-index-service.js` caches and serves
  `data/map-index.json` map names.
- `src/shared/ui/virtual-table.js` virtualized table rendering for large data.
- `src/shared/core/*` common utils, theme config, and animations.

## Entry Points

- JavaScript: `index.html` -> `src/app/main.js`
- Styles: `index.html` -> `styles/main.css`

