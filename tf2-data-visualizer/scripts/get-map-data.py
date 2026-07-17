"""Refresh both map-index.json and map-modes.json."""

import argparse
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = PROJECT_ROOT / "scripts"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh the TF2 map list and map-mode lookup."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help=(
            "Path to TF2's items_game.txt (or its containing directory). "
            "If omitted, get-maps.py auto-detects it."
        ),
    )
    parser.add_argument(
        "--maps-output",
        type=Path,
        default=PROJECT_ROOT / "data" / "map-index.json",
        help="Map-list output path (default: data/map-index.json)",
    )
    parser.add_argument(
        "--modes-output",
        type=Path,
        default=PROJECT_ROOT / "data" / "map-modes.json",
        help="Map-mode output path (default: data/map-modes.json)",
    )
    return parser.parse_args()


def run_script(script: str, *args: str) -> None:
    command = [sys.executable, str(SCRIPTS_DIR / script), *args]
    subprocess.run(command, check=True, cwd=PROJECT_ROOT)


def main() -> None:
    args = parse_args()

    maps_args = ["--output", str(args.maps_output)]
    if args.input is not None:
        maps_args.extend(["--input", str(args.input)])

    print("Refreshing map list...", flush=True)
    run_script("get-maps.py", *maps_args)

    print("\nRefreshing map modes...", flush=True)
    run_script("get-map-modes.py", "--output", str(args.modes_output))


if __name__ == "__main__":
    main()
