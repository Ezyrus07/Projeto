param(
  [string]$Root = ".",
  [string]$OutFile = "docs/junk-files-report.txt"
)

$ErrorActionPreference = "Stop"

$patterns = @(
  "*_tmp*",
  "*_snippet*",
  "*_dev*",
  "*copy*",
  "*.bak",
  "*.old",
  "*.orig"
)

$exclude = @(
  "node_modules",
  ".git",
  "archive"
)

function IsExcluded([string]$fullPath) {
  $f = $fullPath.Replace('\','/')
  foreach ($d in $exclude) {
    if ($f -match "/$d/") { return $true }
  }
  return $false
}

$files = Get-ChildItem -Path $Root -Recurse -File | Where-Object {
  -not (IsExcluded $_.FullName)
}

$matches = @()
foreach ($f in $files) {
  foreach ($p in $patterns) {
    if ($f.Name -like $p) {
      $matches += $f
      break
    }
  }
}

$lines = @()
$lines += "Junk Files Audit"
$lines += "Generated: $(Get-Date -Format s)"
$lines += "Root: $Root"
$lines += "Matches: $($matches.Count)"
$lines += ""
$lines += "path"

$rootFull = (Resolve-Path $Root).Path.Replace('\','/')
$matches | Sort-Object FullName -Unique | ForEach-Object {
  $full = $_.FullName.Replace('\','/')
  $rel = $full.Substring($rootFull.Length + 1)
  $lines += $rel
}

$outDir = Split-Path -Parent $OutFile
if ($outDir -and !(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$lines | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "Report written to $OutFile"
