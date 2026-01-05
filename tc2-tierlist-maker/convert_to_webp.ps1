# WebP Conversion Script for Tierlist Images
# Uses ffmpeg to convert PNG images to WebP format

$tierlists_dir = Join-Path $PSScriptRoot "tierlists"

# Get all subdirectories (tierlist folders)
$folders = Get-ChildItem -Path $tierlists_dir -Directory

foreach ($folder in $folders) {
    Write-Host "Processing folder: $($folder.Name)" -ForegroundColor Cyan
    
    # Get all PNG files in this folder
    $pngFiles = Get-ChildItem -Path $folder.FullName -Filter "*.png"
    
    foreach ($png in $pngFiles) {
        $webpPath = [System.IO.Path]::ChangeExtension($png.FullName, ".webp")
        
        Write-Host "  Converting: $($png.Name) -> $([System.IO.Path]::GetFileName($webpPath))"
        
        # Convert using ffmpeg with quality 90
        $result = & ffmpeg -i $png.FullName -quality 90 -y $webpPath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            # Remove original PNG after successful conversion
            Remove-Item $png.FullName -Force
            Write-Host "    Done (removed original)" -ForegroundColor Green
        } else {
            Write-Host "    Failed to convert!" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Conversion complete!" -ForegroundColor Green
Write-Host "Run 'python gen_manifest.py' to regenerate the manifest with new .webp filenames."
