$ErrorActionPreference = 'Continue'
$screens = @(
  "sodam-v3-01-auth--003",
  "sodam-v3-12-notice--N12",
  "sodam-v3-04-payroll--031",
  "sodam-v3-04-payroll--029",
  "sodam-v3-04-payroll--030",
  "sodam-v3-09-schedule--S7",
  "sodam-v3-06-settings--044"
)
# density 320 => dp = px/2
$breakpoints = @(
  @{name='compact'; w=680;  h=1800}, # 340dp width
  @{name='normal';  w=800;  h=1800}, # 400dp width
  @{name='wide';    w=1000; h=1800}  # 500dp width
)

$logFile = "C:\Users\LeeHoYoung\Downloads\Project_sodam\artifacts\v3-visual-responsive\batch-log.txt"
New-Item -ItemType Directory -Force -Path "C:\Users\LeeHoYoung\Downloads\Project_sodam\artifacts\v3-visual-responsive" | Out-Null
Set-Location "C:\Users\LeeHoYoung\Downloads\Project_sodam\frontend"

foreach ($screen in $screens) {
    foreach ($bp in $breakpoints) {
        $line = ""
        try {
            & .\scripts\v3-responsive-capture.ps1 -Serial emulator-5554 -ScreenId $screen -Breakpoint $bp.name -WidthPx $bp.w -HeightPx $bp.h
            $line = "[OK] $screen $($bp.name)"
        } catch {
            $line = "[FAIL] $screen $($bp.name) : $($_.Exception.Message)"
        }
        Write-Host $line
        Add-Content -Path $logFile -Value $line -Encoding utf8
    }
}
Add-Content -Path $logFile -Value "DONE" -Encoding utf8
Write-Host "DONE"
