#!/usr/bin/env python3
"""
Manifest Generator for Tierlist Maker

Scans the tierlists/ directory and generates:
- A manifest.json inside each tierlist folder (with image data)
- A tierlists.json index file listing all available tierlists

Usage:
    python gen_manifest.py

Run this from the tierlist-maker root directory.
"""

import os
import json
import re
from pathlib import Path

# Configuration
TIERLISTS_DIR = "tierlists"
INDEX_FILE = os.path.join(TIERLISTS_DIR, "tierlists.json")
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


def has_images(folder: Path) -> bool:
    """Check if a folder directly contains any image files."""
    for file in folder.iterdir():
        if file.is_file() and file.suffix.lower() in SUPPORTED_EXTENSIONS:
            return True
    return False


def has_subdirectories(folder: Path) -> bool:
    """Check if a folder contains subdirectories (excluding hidden ones)."""
    for item in folder.iterdir():
        if item.is_dir() and not item.name.startswith('.'):
            return True
    return False


def is_tierlist_folder(folder: Path) -> bool:
    """
    Determine if a folder is a "tierlist folder" (category folder).
    A folder is a category if it has NO images but HAS subdirectories.
    """
    return not has_images(folder) and has_subdirectories(folder)


def scan_folder_recursive(folder: Path, parent_id: str = "") -> dict | None:
    """
    Recursively scan a folder and return its structure.
    Returns a folder entry, tierlist entry, or None if empty.
    """
    # Skip hidden folders
    if folder.name.startswith('.'):
        return None
    
    folder_id = f"{parent_id}/{folder.name}" if parent_id else folder.name
    folder_name = format_name(folder.name)
    
    # Check if this is a category folder (no images, has subdirs)
    if is_tierlist_folder(folder):
        children = []
        for subfolder in sorted(folder.iterdir()):
            if subfolder.is_dir():
                child = scan_folder_recursive(subfolder, folder_id)
                if child:
                    children.append(child)
        
        if children:
            print(f"Detected folder: {folder_id} ({len(children)} children)")
            return {
                "type": "folder",
                "id": folder_id,
                "name": folder_name,
                "children": children
            }
        return None
    
    # Otherwise, treat as a tierlist (has images)
    images = []
    for idx, file in enumerate(sorted(folder.iterdir()), start=1):
        if not file.is_file():
            continue
        
        # Skip manifest.json itself
        if file.name == 'manifest.json':
            continue
        
        ext = file.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue
        
        # Create image entry with just filename (path built at runtime)
        image_data = {
            "id": f"{folder.name}-{idx}",
            "src": file.name,
            "name": format_name(file.name)
        }
        images.append(image_data)
    
    if images:
        # Create manifest for this tierlist folder
        manifest = {
            "id": folder_id,
            "name": folder_name,
            "images": images
        }
        
        # Write manifest.json inside the tierlist folder
        manifest_path = folder / "manifest.json"
        write_tierlist_manifest(manifest, manifest_path)
        
        print(f"Generated: {manifest_path} ({len(images)} images)")
        
        return {
            "id": folder_id,
            "name": folder_name
        }
    
    return None


def scan_and_generate() -> list:
    """Scan tierlists directory and generate manifest.json in each folder."""
    tierlist_index = []
    
    tierlists_path = Path(TIERLISTS_DIR)
    
    if not tierlists_path.exists():
        print(f"Error: '{TIERLISTS_DIR}' directory not found!")
        print("Make sure to run this script from the project root.")
        return []
    
    # Iterate through top-level subdirectories
    for folder in sorted(tierlists_path.iterdir()):
        if not folder.is_dir():
            continue
        
        result = scan_folder_recursive(folder)
        if result:
            tierlist_index.append(result)
    
    return tierlist_index


def write_tierlist_manifest(manifest: dict, output_path: Path):
    """Write a tierlist's manifest.json in a readable format."""
    lines = ["{"]
    lines.append(f'    "id": "{manifest["id"]}",')
    lines.append(f'    "name": "{manifest["name"]}",')
    lines.append('    "images": [')
    
    # Each image on one line
    for j, img in enumerate(manifest["images"]):
        comma = "," if j < len(manifest["images"]) - 1 else ""
        lines.append(f'        {{ "id": "{img["id"]}", "src": "{img["src"]}", "name": "{img["name"]}" }}{comma}')
    
    lines.append("    ]")
    lines.append("}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def write_index(tierlist_index: list, output_file: str):
    """Write the tierlists.json index file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(tierlist_index, f, indent=4)
        f.write('\n')


def main():
    print("=" * 50)
    print("Tierlist Manifest Generator (Per-Folder)")
    print("=" * 50)
    print()
    
    tierlist_index = scan_and_generate()
    
    if not tierlist_index:
        print("\nNo tierlists found!")
        print(f"Add subdirectories with images to '{TIERLISTS_DIR}/'")
        return
    
    # Write index file
    write_index(tierlist_index, INDEX_FILE)
    
    print()
    print(f"Generated index: {INDEX_FILE}")
    print(f"Total: {len(tierlist_index)} tierlist(s)")
    print()
    print("Done!")


if __name__ == "__main__":
    main()
