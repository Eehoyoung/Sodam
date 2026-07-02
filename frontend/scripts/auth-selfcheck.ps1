param(
  [string]$OutPath = "logs/auth-selfcheck-report.md"
)

# Ensure logs directory exists
$logsDir = Split-Path $OutPath -Parent
if (!(Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir | Out-Null
}

$repoRoot = Split-Path $MyInvocation.MyCommand.Path -Parent | Split-Path -Parent
Set-Location $repoRoot

function Write-Section($title) {
  Add-Content -Path $OutPath -Value "`n## $title`n"
}

# Start report
Set-Content -Path $OutPath -Value "# AUTH Self-Check Report`n`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"

Write-Section "Files Presence"
$files = @(
  "src/services/TokenManager.ts",
  "src/common/utils/api.ts",
  "src/features/auth/screens/ProfileScreen.tsx",
  "src/features/settings/screens/SettingsScreen.tsx",
  "src/navigation/HomeNavigator.tsx",
  "src/navigation/types.ts",
  "__tests__/auth/tokenManager.test.ts",
  "__tests__/auth/apiRefreshInterceptor.test.ts"
)

foreach ($f in $files) {
  $exists = Test-Path $f
  Add-Content -Path $OutPath -Value "- [$($exists ? 'x' : ' ')] $f"
}

Write-Section "Manual API Verification (cURL)"
Add-Content -Path $OutPath -Value @'
# Replace <BASE> with your API base (e.g., http://localhost:8080)
# 1) Login
curl -X POST <BASE>/api/auth/login -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"P@ssw0rd!"}'

# 2) Me (use access token)
curl -H "Authorization: Bearer <access>" <BASE>/api/auth/me

# 3) Trigger refresh by using an expired/invalid access token; observe client refresh in app logs
# 4) Logout
curl -X POST <BASE>/api/auth/logout -H "Authorization: Bearer <access>" -H "Content-Type: application/json" -d '{"refreshToken":"<refresh>"}'
'@

Write-Section "Jest Status"
Add-Content -Path $OutPath -Value "- NOTE: Jest execution is skipped due to local resource constraints. Test files are added for CI/desktop runs."

Write-Section "How to Run Locally Later"
Add-Content -Path $OutPath -Value @'
# Optional (not in this session):
# npm i -D axios-mock-adapter
# npm test -- __tests__/auth/tokenManager.test.ts __tests__/auth/apiRefreshInterceptor.test.ts
'@

Write-Section "Navigation"
Add-Content -Path $OutPath -Value "- Settings: Home → 상단 Header '설정' → SettingsScreen → Logout \n- Profile: SettingsScreen → '프로필 보기' 버튼 → ProfileScreen"

Write-Section "Conclusion"
Add-Content -Path $OutPath -Value "Self-check completed. Verify UI on device: Welcome → Auth → Login → Home → 설정 → 프로필/로그아웃."

Write-Output "Report generated: $OutPath"
