"""
TC2 Time Calculator - Image Downloader

Downloads all class images from the TC2 Wiki and the og:image preview
to local storage in assets/images/

Uses only built-in Python libraries (no pip install required)
"""

import os
import urllib.request
import ssl

# Create assets/images directory
IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# TC2 Class images from the wiki
CLASS_IMAGES = {
    "flanker": "https://static.wikia.nocookie.net/tc2/images/f/ff/GRNFlanker_render23.png",
    "trooper": "https://static.wikia.nocookie.net/tc2/images/d/de/GRNTrooper_render23.png",
    "arsonist": "https://static.wikia.nocookie.net/tc2/images/1/18/GRNArsonist_render23.png",
    "annihilator": "https://static.wikia.nocookie.net/tc2/images/5/59/GRNAnnihilator_render23.png",
    "brute": "https://static.wikia.nocookie.net/tc2/images/8/8a/GRNBrute_render23.png",
    "mechanic": "https://static.wikia.nocookie.net/tc2/images/5/50/GRNMechanic_render23.png",
    "doctor": "https://static.wikia.nocookie.net/tc2/images/3/34/GRNDoctor_render23.png",
    "marksman": "https://static.wikia.nocookie.net/tc2/images/c/cc/GRNMarksman_render23.png",
    "agent": "https://static.wikia.nocookie.net/tc2/images/6/62/GRNAgent_render23.png",
}

# OG Image for social media preview
OG_IMAGE_URL = "https://i.imgur.com/YoAihg6.png"

def download_image(url, filename):
    """Download an image from URL and save it locally."""
    filepath = os.path.join(IMAGES_DIR, filename)
    
    print(f"Downloading {filename}...")
    
    # Create SSL context that doesn't verify (for wiki redirects)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Set up request with user agent
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=30) as response:
            data = response.read()
            
        with open(filepath, "wb") as f:
            f.write(data)
        
        print(f"  [OK] Saved to {filepath}")
        return True
        
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False

def main():
    print("=" * 50)
    print("TC2 Time Calculator - Image Downloader")
    print("=" * 50)
    print(f"\nSaving images to: {IMAGES_DIR}\n")
    
    success_count = 0
    total_count = len(CLASS_IMAGES) + 1  # +1 for og-image
    
    # Download class images
    for name, url in CLASS_IMAGES.items():
        if download_image(url, f"{name}.png"):
            success_count += 1
    
    # Download og:image
    if download_image(OG_IMAGE_URL, "og-image.png"):
        success_count += 1
    
    print("\n" + "=" * 50)
    print(f"Downloaded {success_count}/{total_count} images successfully")
    print("=" * 50)

if __name__ == "__main__":
    main()
