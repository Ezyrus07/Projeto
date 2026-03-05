param(
  [string]$Source = "frontend",
  [string]$Mirror = "frontend/frontend"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $Source)) {
  throw "Source path not found: $Source"
}
if (!(Test-Path $Mirror)) {
  New-Item -ItemType Directory -Path $Mirror | Out-Null
}

$srcFull = (Resolve-Path $Source).Path
$mirrorFull = (Resolve-Path $Mirror).Path

function To-Rel([string]$full, [string]$root) {
  $f = $full.Replace('\','/')
  $r = $root.Replace('\','/')
  return $f.Substring($r.Length + 1)
}

$copied = 0

Get-ChildItem -Path $Source -Recurse -File | ForEach-Object {
  $fileFull = $_.FullName
  # Evita loop: não replica conteúdo que já está dentro do espelho.
  if ($fileFull.StartsWith($mirrorFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    return
  }

  $rel = To-Rel $fileFull $srcFull
  $dest = Join-Path $Mirror $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }

  $shouldCopy = $true
  if (Test-Path $dest) {
    $srcHash = (Get-FileHash -Algorithm SHA256 -Path $fileFull).Hash
    $dstHash = (Get-FileHash -Algorithm SHA256 -Path $dest).Hash
    $shouldCopy = $srcHash -ne $dstHash
  }

  if ($shouldCopy) {
    Copy-Item -Path $fileFull -Destination $dest -Force
    $copied++
  }
}

Write-Host "Mirror sync finished. Files copied/updated: $copied"
