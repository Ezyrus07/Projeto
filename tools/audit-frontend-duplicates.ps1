param(
  [string]$RootA = "frontend",
  [string]$RootB = "frontend/frontend",
  [string]$OutFile = "docs/frontend-duplicates-report.txt"
)

$ErrorActionPreference = "Stop"

function Get-RelFiles([string]$root, [string]$excludePrefix = "") {
  if (!(Test-Path $root)) { return @() }
  $resolvedRoot = (Resolve-Path $root).Path.Replace('\','/')
  $resolvedExclude = ""
  if ($excludePrefix -and (Test-Path $excludePrefix)) {
    $resolvedExclude = (Resolve-Path $excludePrefix).Path.Replace('\','/')
  }
  return (Get-ChildItem -Path $root -Recurse -File | ForEach-Object {
    $full = $_.FullName.Replace('\','/')
    if ($resolvedExclude -and $full.StartsWith($resolvedExclude, [System.StringComparison]::OrdinalIgnoreCase)) {
      return
    }
    $full.Substring($resolvedRoot.Length + 1)
  } | Where-Object { $_ -and $_.Trim().Length -gt 0 }) | Sort-Object -Unique
}

function Get-HashSafe([string]$path) {
  try { return (Get-FileHash -Algorithm SHA256 -Path $path).Hash } catch { return "" }
}

$aFiles = Get-RelFiles $RootA $RootB
$bFiles = Get-RelFiles $RootB

$dup = $aFiles | Where-Object { $bFiles -contains $_ } | Sort-Object

$lines = @()
$lines += "Frontend Duplicate Audit"
$lines += "Generated: $(Get-Date -Format s)"
$lines += "RootA: $RootA"
$lines += "RootB: $RootB"
$lines += "Total duplicated paths: $($dup.Count)"
$lines += ""
$lines += "path|same_content"

foreach ($rel in $dup) {
  $a = Join-Path $RootA $rel
  $b = Join-Path $RootB $rel
  $same = (Get-HashSafe $a) -eq (Get-HashSafe $b)
  $lines += "$rel|$same"
}

$outDir = Split-Path -Parent $OutFile
if ($outDir -and !(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$lines | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "Report written to $OutFile"
