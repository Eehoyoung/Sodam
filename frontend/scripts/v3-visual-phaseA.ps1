$ErrorActionPreference = 'Continue'
$ids = @(
  "sodam-v3-01-auth--006",
  "sodam-v3-01-auth--051",
  "sodam-v3-03-employee--024",
  "sodam-v3-03-employee--026",
  "sodam-v3-03-employee--027",
  "sodam-v3-02-owner--052",
  "sodam-v3-02-owner--054",
  "sodam-v3-02-owner--055",
  "sodam-v3-02-owner--056",
  "sodam-v3-02-owner--057"
)
$outputRoot = "C:\Users\LeeHoYoung\Downloads\Project_sodam\artifacts\v3-visual"
$logFile = Join-Path $outputRoot "phaseA-log.txt"

Set-Location "C:\Users\LeeHoYoung\Downloads\Project_sodam\frontend"

foreach ($id in $ids) {
    foreach ($source in @('reference','actual')) {
        $captureKind = if ($source -eq 'reference') {'native-reference'} else {'actual'}
        $targetPng = Join-Path $outputRoot "$captureKind\$id.png"
        if (Test-Path -LiteralPath $targetPng) {
            Remove-Item -LiteralPath $targetPng -Force
        }
        $routeMarker = "v3-visual-$source-$id"
        $line = ""
        try {
            & .\scripts\capture-v3-android-visual.ps1 -Serial emulator-5554 -ScreenId $id -Source $source -Theme light -RequireText $routeMarker -ColdStart -OutputRoot $outputRoot
            if ($LASTEXITCODE -ne 0) {
                $line = "[FAIL-EXIT] $id $source (exit $LASTEXITCODE)"
            } else {
                $line = "[OK] $id $source"
            }
        } catch {
            $line = "[FAIL-EXC] $id $source : $($_.Exception.Message)"
        }
        Write-Host $line
        Add-Content -Path $logFile -Value $line -Encoding utf8
    }
}
Add-Content -Path $logFile -Value "DONE" -Encoding utf8
Write-Host "DONE"
