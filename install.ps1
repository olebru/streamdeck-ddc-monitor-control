param(
  [string]$PluginFile,
  [string]$Repository = 'olebru/streamdeck-ddc-monitor-control'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-LatestPluginFile([string]$Repository) {
  $headers = @{ 'User-Agent' = 'streamdeck-ddc-monitor-control-install' }
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest" -Headers $headers
  $asset = @($release.assets | Where-Object { $_.name -like '*.streamDeckPlugin' }) | Select-Object -First 1
  if (-not $asset) { throw "Release $($release.tag_name) of $Repository contains no .streamDeckPlugin file." }
  $destination = Join-Path ([IO.Path]::GetTempPath()) $asset.name
  Write-Host "Downloading $($asset.name) from release $($release.tag_name)"
  Invoke-WebRequest -Uri $asset.url -Headers ($headers + @{ 'Accept' = 'application/octet-stream' }) -OutFile $destination -UseBasicParsing
  return $destination
}

if (-not $PluginFile) {
  $PluginFile = Get-LatestPluginFile $Repository
}
if (-not (Test-Path -LiteralPath $PluginFile)) {
  throw "Plugin file '$PluginFile' not found."
}

Write-Host "Opening $PluginFile in Stream Deck"
Start-Process -FilePath (Resolve-Path -LiteralPath $PluginFile).Path
