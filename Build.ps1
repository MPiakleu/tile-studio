#Requires -Version 5.1
[CmdletBinding()]
param([switch]$SkipInstall)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Push-Location $PSScriptRoot
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22.x (22.14.0 or later) before building.' }
    $tileNodeVersion = & node --version
    if ($LASTEXITCODE -ne 0) { throw 'Node.js version check failed.' }
    $tileParsedVersion = [Version]$tileNodeVersion.Trim().TrimStart('v')
    if ($tileParsedVersion.Major -ne 22 -or $tileParsedVersion -lt [Version]'22.14.0') { throw "Use Node.js 22.x, at least 22.14.0. Found $tileNodeVersion." }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm was not found in PATH.' }
    if (-not $SkipInstall) {
        & npm ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Review the installation output before continuing.' }
    }
    # package runs tests, strict ESLint, production Heft and SPPKG verification.
    & npm run package
    if ($LASTEXITCODE -ne 0) { throw 'SPFx production packaging failed. Review the errors above.' }
    $tilePackagePath = Join-Path $PSScriptRoot 'sharepoint/solution/imberon-tile-studio.sppkg'
    if (-not (Test-Path -LiteralPath $tilePackagePath -PathType Leaf)) { throw 'Build finished without the expected .sppkg.' }
    Write-Host "Package ready: $tilePackagePath"
    Get-FileHash -LiteralPath $tilePackagePath -Algorithm SHA256
} finally {
    Pop-Location
}
