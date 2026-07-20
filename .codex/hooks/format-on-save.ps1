$ErrorActionPreference = "Stop"

$inputText = [Console]::In.ReadToEnd()
$filePath = $null

try {
    $payload = $inputText | ConvertFrom-Json
    if ($payload.tool_input.file_path) {
        $filePath = [string]$payload.tool_input.file_path
    } elseif ($payload.file_path) {
        $filePath = [string]$payload.file_path
    }
} catch {
    exit 0
}

if (-not $filePath -or $filePath -notmatch '[\\/]frontend[\\/]src[\\/].*\.(ts|tsx|js)$') {
    exit 0
}

$root = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or -not $root) {
    exit 0
}

$frontend = Join-Path $root "frontend"
$prettier = Join-Path $frontend "node_modules\prettier"
if ((Test-Path -LiteralPath $filePath) -and (Test-Path -LiteralPath $prettier)) {
    Push-Location $frontend
    try {
        & npx prettier --write $filePath *> $null
    } finally {
        Pop-Location
    }
}

exit 0
