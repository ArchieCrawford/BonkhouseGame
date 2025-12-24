[CmdletBinding()]
param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  Add-Type -AssemblyName System.Drawing
} catch {
  throw "Failed to load System.Drawing. If you're on PowerShell 7+, ensure you're running on Windows. Error: $($_.Exception.Message)"
}

function Resize-PngInPlace {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [int]$Width,
    [Parameter(Mandatory)] [int]$Height
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path"
  }

  $fullPath = (Resolve-Path -LiteralPath $Path).Path
  Write-Host "Resizing $fullPath -> ${Width}x${Height}"

  if ($DryRun) { return }

  $srcImage = $null
  $dstBitmap = $null
  $graphics = $null

  try {
    # Open source
    $srcImage = [System.Drawing.Image]::FromFile($fullPath)

    # Create destination bitmap
    $dstBitmap = New-Object System.Drawing.Bitmap $Width, $Height
    $dstBitmap.SetResolution($srcImage.HorizontalResolution, $srcImage.VerticalResolution)

    # Draw with high quality (stretch to exact size like ImageMagick "!" force)
    $graphics = [System.Drawing.Graphics]::FromImage($dstBitmap)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($srcImage, 0, 0, $Width, $Height)

    # Save to temp, then replace original (avoids partially-written files)
    $tmpPath = "$fullPath.__tmp.png"
    $dstBitmap.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $srcImage.Dispose()
    $srcImage = $null

    Move-Item -Force -LiteralPath $tmpPath -Destination $fullPath
  }
  finally {
    if ($graphics) { $graphics.Dispose() }
    if ($dstBitmap) { $dstBitmap.Dispose() }
    if ($srcImage) { $srcImage.Dispose() }
  }
}

$targets = @(
  @{ File = 'icon.png';        W = 512;  H = 512  }
  @{ File = 'og.png';          W = 1200; H = 630  }
  @{ File = 'hero.png';        W = 1200; H = 1200 }
  @{ File = 'Splash.png';      W = 1080; H = 1920 }
  @{ File = 'Screenshot1.png'; W = 1280; H = 720  }
  @{ File = 'Screenshot2.png'; W = 1280; H = 720  }
)

foreach ($t in $targets) {
  Resize-PngInPlace -Path $t.File -Width $t.W -Height $t.H
}

Write-Host "Done."