param(
  [string]$Root = ".",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$keepNames = @(
  "README_DEVSERVER.txt",
  "SQL_FIX_DEV_POSTAR_FOTO_CAPA.sql"
)

$patterns = @(
  "*_tmp*",
  "*_snippet*",
  "*_dev*",
  "manifest copy.webmanifest"
)

$excludeDirs = @("node_modules", ".git", "archive")

function IsExcluded([string]$fullPath) {
  $f = $fullPath.Replace('\','/')
  foreach ($d in $excludeDirs) {
    if ($f -match "/$d/") { return $true }
  }
  return $false
}

$rootFull = (Resolve-Path $Root).Path
$files = Get-ChildItem -Path $Root -Recurse -File | Where-Object { -not (IsExcluded $_.FullName) }

$targets = @()
foreach ($f in $files) {
  if ($keepNames -contains $f.Name) { continue }
  foreach ($p in $patterns) {
    if ($f.Name -like $p) {
      $targets += $f
      break
    }
  }
}

$targets = $targets | Sort-Object FullName -Unique

Write-Host "Junk targets found:" $targets.Count
if (-not $targets.Count) { exit 0 }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveRoot = Join-Path $Root ("archive/junk-files-" + $stamp)

if (-not $Apply) {
  Write-Host "Dry-run mode. Use -Apply to move files to archive."
  $targets | ForEach-Object {
    $rel = $_.FullName.Substring($rootFull.Length + 1).Replace('\','/')
    Write-Host " - $rel"
  }
  exit 0
}

foreach ($file in $targets) {
  $rel = $file.FullName.Substring($rootFull.Length + 1)
  $dest = Join-Path $archiveRoot $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }
  Move-Item -Path $file.FullName -Destination $dest -Force
}

Write-Host "Archived and removed:" $targets.Count
Write-Host "Archive root:" $archiveRoot
