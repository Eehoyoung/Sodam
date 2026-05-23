<#
.SYNOPSIS
  Generates a standardized AI issue-resolution prompt skeleton for the Sodam Front End project.

.DESCRIPTION
  Outputs a pre-formatted prompt aligned with docs\가이드_AI_프롬프트_작성_베스트프랙티스_v2.1.3_2025-08-30.md and
  .junie\guidelines.md (v3) requirements. Supports optional inline population and saving to a file.

.PARAMETER Issue
  Short description of the problem/request.

.PARAMETER Impact
  Scope and impact area (features, platforms, configs, tests, docs).

.PARAMETER Repro
  Reproduction steps (if any).

.PARAMETER AC
  Acceptance criteria / Definition of Done.

.PARAMETER Files
  Target file paths (use backslashes). Separate multiple with ";".

.PARAMETER Symbols
  Components/Functions/Hooks/Tests involved. Separate multiple with ";".

.PARAMETER Steps
  Step-by-step task list (concise). Separate multiple with ";".

.PARAMETER Verify
  Post-change verification (tests/build/scripts). Separate multiple with ";".

.PARAMETER OutFile
  Optional output file path to save the generated prompt (UTF-8). Parent directory will be created if missing.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\generate-ai-prompt.ps1 `
    -Issue "앱 시작 시 경고 로그 발생" `
    -Impact "Android 빌드 스크립트, App.tsx, 로그 수집 스크립트" `
    -Repro "앱 실행 후 Logcat 확인" `
    -AC "경고 로그 미발생, 빌드/테스트 통과" `
    -Files "App.tsx;scripts\\collect-android-env.ps1" `
    -Symbols "App;useEffect" `
    -Steps "원인분석;최소 변경 수정;테스트 실행" `
    -Verify "npm test;gradlew assembleDebug" `
    -OutFile ".\\docs\\AI_Prompt_Example_250830.md"

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\generate-ai-prompt.ps1 -Issue "NFC 리더기 초기화 오류" | Set-Clipboard
#>
param(
  [string]$Issue = "",
  [string]$Impact = "",
  [string]$Repro = "",
  [string]$AC = "",
  [string]$Files = "",
  [string]$Symbols = "",
  [string]$Steps = "",
  [string]$Verify = "",
  [string]$OutFile
)

# Normalize multi-value fields (split by ';' and join with new lines + '- ' prefix)
function Format-ListField {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $items = $Value -split ";" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
  if ($items.Count -eq 0) { return "" }
  return ($items | ForEach-Object { "- $_" }) -join "`n"
}

$filesList = Format-ListField -Value $Files
$symbolsList = Format-ListField -Value $Symbols
$stepsList = Format-ListField -Value $Steps
$verifyList = Format-ListField -Value $Verify

$prompt = @"
[이슈 요약]
- 문제/요청: $Issue
- 영향 범위: $Impact
- 재현 방법(있다면): $Repro
- 기대 결과(수락기준): $AC

[환경/조건]
- OS/셸: Windows + PowerShell, 경로는 \\ 사용
- RN/React/Node: RN 0.81.0(New Arch, Hermes) / React 19.1.0 / Node >=18
- Android: Compile/Target SDK 36, Min 24
- 테스트: Jest preset ‘react-native’
- 제품 정책: 태그 기반 근태(NFC 중심), 잔존물 방지 정책 준수
- 내비게이션: 초기 라우트 Welcome 고정
- 원칙: 최소 변경, 변경된 파일 관련 테스트 점검
- 경로/명령: PowerShell 포맷, 전용 툴과 터미널 명령 결합 금지

[대상 파일/심볼]
- 파일 경로:
$filesList
- 관련 컴포넌트/함수/훅/테스트:
$symbolsList

[세부 작업]
- 단계별 할 일 목록:
$stepsList
- 변경 후 검증 방법(테스트/빌드/스크립트):
$verifyList

[출력 형식 요구]
- <UPDATE> 섹션에 PREVIOUS_STEP/PLAN/NEXT_STEP 포함
- PowerShell 규칙 및 특수 도구 사용 규칙 준수
- 코드 수정 시 최소 변경, 에지 케이스 고려
"@

if ($OutFile) {
  $parent = Split-Path -Path $OutFile -Parent
  if ($parent -and -not (Test-Path -Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Set-Content -Path $OutFile -Value $prompt -Encoding UTF8
  Write-Host "Prompt written to $OutFile"
} else {
  Write-Output $prompt
}
