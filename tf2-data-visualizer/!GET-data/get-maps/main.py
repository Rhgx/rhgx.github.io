import os
import json
import re

# Paths
INPUT_PATH = r"C:\Program Files (x86)\Steam\steamapps\common\Team Fortress 2\tf\scripts\items\items_game.txt"
OUTPUT_PATH = "extracted_maps.json"

def extract_maps():
    if not os.path.exists(INPUT_PATH):
        print(f"Error: Could not find file at {INPUT_PATH}")
        return

    print("Reading items_game.txt... (this may take a moment)")
    
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Locate the start of the master_maps_list
    # We look for the key name followed by an opening brace
    pattern = re.compile(r'"master_maps_list"\s*\{', re.IGNORECASE)
    match = pattern.search(content)
    
    if not match:
        print("Error: Could not locate 'master_maps_list' in the file.")
        return

    start_index = match.end() - 1
    brace_count = 0
    end_index = -1

    # Walk through the string to find the matching closing brace for the block
    for i in range(start_index, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_index = i + 1
                break

    if end_index == -1:
        print("Error: Could not find the end of the map list block.")
        return

    map_block = content[match.start():end_index]

    # Regex to find map IDs and their names within the block
    # Looks for "ID" { and then "name" "map_name"
    map_entry_pattern = re.compile(
        r'"(\d+)"\s*\{[^}]*?"name"\s*"([^"]+)"', 
        re.DOTALL
    )

    extracted_data = {"master_maps_list": {}}

    for map_match in map_entry_pattern.finditer(map_block):
        map_id = map_match.group(1)
        map_name = map_match.group(2)
        extracted_data["master_maps_list"][map_id] = {"name": map_name}

    # Save to JSON
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(extracted_data, f, indent=2)

    print(f"Success! Extracted {len(extracted_data['master_maps_list'])} maps to {OUTPUT_PATH}")

if __name__ == "__main__":
    extract_maps()