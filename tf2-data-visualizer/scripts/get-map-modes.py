"""
Scrapes the TF2 wiki List of Maps page and extracts the canonical game mode
for every official map. Writes data/map-modes.json.

Usage:
    python scripts/get-map-modes.py [--output path/to/map-modes.json]

Requirements:
    pip install requests beautifulsoup4 lxml
"""

import argparse
import json
from collections import Counter
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Run:\n    pip install requests beautifulsoup4 lxml")
    raise

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "data" / "map-modes.json"

WIKI_URL = "https://wiki.teamfortress.com/wiki/List_of_maps"

# Maps the wiki "Game mode" cell text to our internal mode key.
# Keys match the prefix-based keys used in the JS app-controller.
WIKI_MODE_TO_KEY: dict[str, str | None] = {
    "Capture the Flag":     "ctf",
    "Control Point":        "cp",       # symmetric 5CP
    "Attack/Defend":        "ad",       # e.g. cp_dustbowl, cp_gorge
    "Attack/DefendPayload": "cppl",     # cppl_gavle (wiki concatenates without space)
    "Attack/Defend Payload":"cppl",     # alternate spacing
    "Medieval Mode":        "medieval", # cp_degrootkeep etc.
    "Domination":           "cp",       # cp_standin — essentially 5CP
    "Territorial Control":  "tc",
    "Payload":              "pl",
    "Payload Race":         "plr",
    "Arena":                "arena",
    "King of the Hill":     "koth",
    "Special Delivery":     "sd",
    "Mann vs. Machine":     "mvm",
    "Robot Destruction":    "rd",
    "Mannpower":            "mann",
    "PASS Time":            "pass",
    "Player Destruction":   "pd",
    "Versus Saxton Hale":   "vsh",
    "Zombie Infection":     "zi",
    "Tug of War":           "tow",
    "Hold the Flag":        "htf",
    "Training Mode":        "tr",
    # Developer / test maps — omit from output
    "Test":                 None,
    "N/A":                  None,
}


def scrape_map_modes(output_path: Path) -> None:
    print(f"Fetching {WIKI_URL} …")
    resp = requests.get(
        WIKI_URL,
        headers={"User-Agent": "tf2-data-visualizer/1.0 (map-modes scraper)"},
        timeout=30,
    )
    resp.raise_for_status()

    # Try lxml first for speed; fall back to the built-in html.parser.
    try:
        soup = BeautifulSoup(resp.text, "lxml")
    except Exception:
        soup = BeautifulSoup(resp.text, "html.parser")

    map_modes: dict[str, str] = {}

    tables = soup.find_all("table", class_="wikitable")
    tables_parsed = 0

    for table in tables:
        header_cells = table.find("tr").find_all(["th", "td"]) if table.find("tr") else []
        headers = [th.get_text(strip=True) for th in header_cells]

        # Only process tables that have both required columns.
        if "File name" not in headers or "Game mode" not in headers:
            continue

        file_col = headers.index("File name")
        mode_col = headers.index("Game mode")
        tables_parsed += 1

        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if not cells or len(cells) <= max(file_col, mode_col):
                continue

            file_name = cells[file_col].get_text(strip=True)
            game_mode = cells[mode_col].get_text(strip=True)

            if not file_name or not game_mode:
                continue

            mode_key = WIKI_MODE_TO_KEY.get(game_mode)
            if mode_key is None:
                if game_mode not in ("Test", "N/A", ""):
                    print(f"  [warn] Unknown game mode '{game_mode}' for '{file_name}'")
                continue

            map_modes[file_name] = mode_key

    if not map_modes:
        print(
            "Error: No maps extracted. "
            "The wiki page structure may have changed — check WIKI_URL or table selectors."
        )
        return

    output: dict = {"map_modes": dict(sorted(map_modes.items()))}
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    print(f"\nSuccess! Extracted {len(map_modes)} maps → {output_path}")
    print(f"(parsed {tables_parsed} table(s) from the wiki page)\n")

    mode_counts = Counter(map_modes.values())
    print("Mode breakdown:")
    for mode, count in sorted(mode_counts.items(), key=lambda x: -x[1]):
        print(f"  {mode:<12} {count} maps")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape wiki.teamfortress.com/wiki/List_of_maps and write a "
            "map-filename → game-mode-key lookup to data/map-modes.json."
        )
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Output JSON path (default: {OUTPUT_PATH})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    scrape_map_modes(args.output)
