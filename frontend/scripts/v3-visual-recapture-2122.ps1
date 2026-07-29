$ErrorActionPreference = 'Continue'
$ids = @("sodam-v3-03-employee--021", "sodam-v3-03-employee--022")
$outputRoot = "C:\Users\LeeHoYoung\Downloads\Project_sodam\artifacts\v3-visual"
$logFile = Join-Path $outputRoot "recapture-2122-log.txt"

Set-Location "C:\Users\LeeHoYoung\Downloads\Project_sodam\frontend"

foreach ($id in $ids) {
    foreach ($source in @('reference','actual')) {
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
