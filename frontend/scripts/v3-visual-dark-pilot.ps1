$ErrorActionPreference = 'Continue'
$ids = @(
  "sodam-v3-01-auth--004",
  "sodam-v3-02-owner--008",
  "sodam-v3-03-employee--009",
  "sodam-v3-03-employee--020",
  "sodam-v3-03-employee--021",
  "sodam-v3-04-payroll--028",
  "sodam-v3-04-payroll--031",
  "sodam-v3-05-info--032",
  "sodam-v3-06-settings--039",
  "sodam-v3-06-settings--047",
  "sodam-v3-06-settings--048",
  "sodam-v3-07-recruitment--R1",
  "sodam-v3-08-contract--C3",
  "sodam-v3-09-schedule--S3",
  "sodam-v3-10-business--B7",
  "sodam-v3-12-notice--N1",
  "sodam-v3-13-ops--O9"
)
$outputRoot = "C:\Users\LeeHoYoung\Downloads\Project_sodam\artifacts\v3-visual-dark"
$logFile = Join-Path $outputRoot "pilot-log.txt"

Set-Location "C:\Users\LeeHoYoung\Downloads\Project_sodam\frontend"

foreach ($id in $ids) {
    foreach ($source in @('reference','actual')) {
        $captureKind = if ($source -eq 'reference') {'native-reference'} else {'actual'}
        $targetPng = Join-Path $outputRoot "$captureKind\$id.png"
        if (Test-Path -LiteralPath $targetPng) {
            $line = "[SKIP] $id $source (already captured)"
            Write-Host $line
            Add-Content -Path $logFile -Value $line -Encoding utf8
            continue
        }
        $routeMarker = "v3-visual-$source-$id"
        $line = ""
        try {
            & .\scripts\capture-v3-android-visual.ps1 -Serial emulator-5554 -ScreenId $id -Source $source -Theme dark -RequireText $routeMarker -ColdStart -OutputRoot $outputRoot
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
