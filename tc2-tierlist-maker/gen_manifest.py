#!/usr/bin/env python3
"""
Manifest Generator for Tierlist Maker

Scans the tierlists/ directory and generates manifest.json
Each subdirectory becomes a tierlist, with all images inside as items.

Usage:
    python generate_manifest.py

Run this from the tierlist-maker-antigravity root directory.
"""

import os
import json
import re
from pathlib import Path

# Configuration
TIERLISTS_DIR = "tierlists"
OUTPUT_FILE = os.path.join(TIERLISTS_DIR, "manifest.json")
SUPPORTED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'}


def format_name(filename: str) -> str:
    """Convert filename/dirname to Title Case with spaces (e.g., 'demoChars' → 'Demo Chars')."""
    # Remove extension
    name = Path(filename).stem
    # Insert space before uppercase letters (for camelCase)
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    # Split by separators (dashes, underscores, spaces)
    parts = re.split(r'[-_\s]+', name)
    # Title case each word and join with spaces
    return ' '.join(part.capitalize() for part in parts)


def scan_tierlists() -> list:
    """Scan tierlists directory and build manifest."""
    tierlists = []
    
    tierlists_path = Path(TIERLISTS_DIR)
    
    if not tierlists_path.exists():
        print(f"Error: '{TIERLISTS_DIR}' directory not found!")
        print("Make sure to run this script from the project root.")
        return []
    
    # Iterate through subdirectories
    for folder in sorted(tierlists_path.iterdir()):
        if not folder.is_dir():
            continue
        
        # Skip hidden folders
        if folder.name.startswith('.'):
            continue
        
        tierlist_id = folder.name
        tierlist_name = format_name(folder.name)
        images = []
        
        # Scan for images in this folder
        for idx, file in enumerate(sorted(folder.iterdir()), start=1):
            if not file.is_file():
                continue
            
            ext = file.suffix.lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            
            # Create just the filename (folder = id, path built at runtime)
            image_data = {
                "id": f"{tierlist_id}-{idx}",
                "src": file.name,
                "name": format_name(file.name)
            }
            images.append(image_data)
        
        if images:
            tierlist = {
                "id": tierlist_id,
                "name": tierlist_name,
                "images": images
            }
            tierlists.append(tierlist)
            print(f"Found tierlist: {tierlist_name} ({len(images)} images)")
    
    return tierlists


def write_manifest(tierlists: list, output_file: str):
    """Write manifest in compact format."""
    lines = ["["]
    
    for i, tierlist in enumerate(tierlists):
        lines.append("    {")
        lines.append(f'        "id": "{tierlist["id"]}",')
        lines.append(f'        "name": "{tierlist["name"]}",')
        lines.append('        "images": [')
        
        # Each image on one line
        for j, img in enumerate(tierlist["images"]):
            comma = "," if j < len(tierlist["images"]) - 1 else ""
            lines.append(f'            {{ "id": "{img["id"]}", "src": "{img["src"]}", "name": "{img["name"]}" }}{comma}')
        
        lines.append("        ]")
        comma = "," if i < len(tierlists) - 1 else ""
        lines.append("    }" + comma)
    
    lines.append("]")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    print("=" * 50)
    print("Tierlist Manifest Generator")
    print("=" * 50)
    print()
    
    tierlists = scan_tierlists()
    
    if not tierlists:
        print("\nNo tierlists found!")
        print(f"Add subdirectories with images to '{TIERLISTS_DIR}/'")
        return
    
    # Write manifest
    write_manifest(tierlists, OUTPUT_FILE)
    
    print()
    print(f"Generated {OUTPUT_FILE}")
    print(f"Total: {len(tierlists)} tierlist(s)")
    print()
    print("Done!")


if __name__ == "__main__":
    main()
