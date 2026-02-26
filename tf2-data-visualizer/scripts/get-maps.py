import argparse
import json
import os
import platform
import re
from pathlib import Path

# Always write to the project's shared data folder
PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "data" / "map-index.json"
ITEMS_RELATIVE_PATH = Path(
    "steamapps/common/Team Fortress 2/tf/scripts/items/items_game.txt"
)
ENV_INPUT_PATH = "TF2_ITEMS_GAME_PATH"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract TF2 map names from items_game.txt into data/map-index.json."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help=(
            "Path to items_game.txt. If omitted, auto-detects from Steam installs "
            f"or ${ENV_INPUT_PATH}."
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Output JSON path (default: {OUTPUT_PATH})",
    )
    return parser.parse_args()


def _vdf_unescape(value: str) -> str:
    # Steam's VDF stores backslashes escaped.
    return value.replace("\\\\", "\\")


def _candidate_steam_roots() -> list[Path]:
    home = Path.home()
    system = platform.system().lower()
    roots: list[Path] = []

    if system == "windows":
        for var in ("PROGRAMFILES(X86)", "PROGRAMFILES"):
            base = os.environ.get(var)
            if base:
                roots.append(Path(base) / "Steam")
    elif system == "linux":
        roots.extend(
            [
                home / ".steam" / "steam",
                home / ".local" / "share" / "Steam",
                home
                / ".var"
                / "app"
                / "com.valvesoftware.Steam"
                / ".local"
                / "share"
                / "Steam",
            ]
        )
    elif system == "darwin":
        roots.append(home / "Library" / "Application Support" / "Steam")

    return roots


def _steam_libraries(steam_root: Path) -> list[Path]:
    libraries = [steam_root]
    library_folders = steam_root / "steamapps" / "libraryfolders.vdf"
    if not library_folders.exists():
        return libraries

    text = library_folders.read_text(encoding="utf-8", errors="replace")

    # New format: "path" "D:\\SteamLibrary"
    for match in re.finditer(r'"path"\s*"([^"]+)"', text, flags=re.IGNORECASE):
        libraries.append(Path(_vdf_unescape(match.group(1))))

    # Old format fallback: "1" "D:\\SteamLibrary"
    for match in re.finditer(r'"\d+"\s*"([^"]+)"', text):
        value = _vdf_unescape(match.group(1))
        if re.search(r"[\\/]", value):
            libraries.append(Path(value))

    unique: list[Path] = []
    seen: set[Path] = set()
    for lib in libraries:
        resolved = lib.expanduser()
        if resolved not in seen:
            seen.add(resolved)
            unique.append(resolved)
    return unique


def find_items_game_path(explicit_input: Path | None = None) -> Path | None:
    candidates: list[Path] = []

    if explicit_input:
        explicit = explicit_input.expanduser()
        if explicit.is_dir():
            explicit = explicit / "items_game.txt"
        return explicit

    env_path = os.environ.get(ENV_INPUT_PATH)
    if env_path:
        env_candidate = Path(env_path).expanduser()
        if env_candidate.is_dir():
            env_candidate = env_candidate / "items_game.txt"
        return env_candidate

    for steam_root in _candidate_steam_roots():
        for library in _steam_libraries(steam_root):
            candidates.append(library / ITEMS_RELATIVE_PATH)

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


def extract_maps(input_path: Path, output_path: Path) -> None:
    if not input_path.exists():
        print(f"Error: Could not find file at {input_path}")
        return

    print("Reading items_game.txt... (this may take a moment)")
    content = input_path.read_text(encoding="utf-8", errors="replace")

    # Find the master_maps_list object and slice its full brace block
    pattern = re.compile(r'"master_maps_list"\s*\{', re.IGNORECASE)
    match = pattern.search(content)
    if not match:
        print("Error: Could not locate 'master_maps_list' in the file.")
        return

    start_index = match.end() - 1
    brace_count = 0
    end_index = -1

    for i in range(start_index, len(content)):
        if content[i] == "{":
            brace_count += 1
        elif content[i] == "}":
            brace_count -= 1
            if brace_count == 0:
                end_index = i + 1
                break

    if end_index == -1:
        print("Error: Could not find the end of the map list block.")
        return

    map_block = content[match.start() : end_index]

    map_entry_pattern = re.compile(
        r'"(\d+)"\s*\{[^}]*?"name"\s*"([^"]+)"',
        re.DOTALL,
    )

    extracted_data = {"master_maps_list": {}}
    for map_match in map_entry_pattern.finditer(map_block):
        map_id = map_match.group(1)
        map_name = map_match.group(2)
        extracted_data["master_maps_list"][map_id] = {"name": map_name}

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(extracted_data, indent=2), encoding="utf-8")
    print(
        f"Success! Extracted {len(extracted_data['master_maps_list'])} maps to {output_path}"
    )


if __name__ == "__main__":
    args = parse_args()
    source_path = find_items_game_path(args.input)
    if source_path is None:
        print("Error: Could not find TF2 items_game.txt automatically.")
        print(
            "Pass --input <path-to-items_game.txt> or set "
            f"{ENV_INPUT_PATH} to the file path."
        )
    else:
        extract_maps(source_path, args.output)
