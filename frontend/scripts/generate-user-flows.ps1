<#!
.SYNOPSIS
  Generate exhaustive or sampled user flows for the Sodam Front End project.

.DESCRIPTION
  This PowerShell script enumerates valid usage flows across roles (대표, 사원, 일반 유저)
  and feature actions (매장 생성, 직원 초대, 근태 관리, 급여 관리, 정책 확인, 등) and writes them
  as a Markdown document. It is designed to scale from dozens to 100,000+ flows while
  keeping logical prerequisites intact via curated templates and combinations.

  OS/Shell: Windows + PowerShell (backslashes in paths)
  RN/React: RN 0.81.0 (New Arch, Hermes), React 19.1.0
  Principle: Change Scale Decision Framework — scalable generator instead of static lists

.PARAMETER MaxFlows
  Maximum number of flows to output. Defaults to 1000. Supports up to 100000+ (be careful with file size).

.PARAMETER OutFile
  Output Markdown file path. Defaults to .\docs\flows\Generated_User_Flows_<YYYY-MM-DD>_<HHmmss>.md

.PARAMETER Roles
  Filter roles to include. Any of: 대표, 사원, 일반. Default: all.

.PARAMETER IncludePlatform
  If set, prefixes each flow with platform variants: Android / iOS / Web.

.PARAMETER IncludeNetwork
  If set, includes network condition tags: Online / Offline (if offline, only offline-safe actions are retained).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\generate-user-flows.ps1 -MaxFlows 10000 -IncludePlatform -IncludeNetwork

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\generate-user-flows.ps1 -Roles 대표,사원 -OutFile .\docs\flows\flows_owner_employee.md

.NOTES
  - QR 코드 관련 잔존물 없음 정책을 준수합니다. (NFC 전용)
  - Initial route: Welcome (정책 유지)
#>

param(
  [int]$MaxFlows = 1000,
  [string]$OutFile,
  [string[]]$Roles = @('대표','사원','일반'),
  [switch]$IncludePlatform,
  [switch]$IncludeNetwork
)

$ErrorActionPreference = 'Stop'

function New-DateStamp {
  return (Get-Date -Format 'yyyy-MM-dd_HHmmss')
}

if (-not $OutFile -or [string]::IsNullOrWhiteSpace($OutFile)) {
  $stamp = New-DateStamp
  $OutFile = Join-Path -Path (Resolve-Path '.').Path -ChildPath "docs\flows\Generated_User_Flows_$stamp.md"
}

# Ensure directory exists
$dir = Split-Path -Path $OutFile -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

# Static vocab (Korean)
$LAUNCH = '앱 실행'
$LOGIN = '로그인'
$LOGOUT = '로그아웃'
$GUEST = '비로그인'

$Stores = @('소담카페','한길분식','별다방','해피마켓','브런치랩')

# Feature actions per role (ordered templates maintain logical prerequisites)
$OwnerTemplates = @(
  @('매장 생성','직원 초대','급여 관리','근로 계약 확인'),
  @('매장 생성','직원 초대','근태 관리','직원 출근 조회'),
  @('매장 생성','임금 설정','급여 관리'),
  @('매장 생성','매장 위치 설정','근태 관리'),
  @('매장 생성','소유권 이전'),
  @('정책 확인'),
  @('노동 정보 열람'),
  @('세무 정보 열람'),
  @('Q&A 관리')
)

$EmployeeTemplates = @(
  @('매장 합류','NFC 출근','NFC 퇴근','실시간 급여 조회'),
  @('월별 근태 조회'),
  @('정책 확인'),
  @('근로 계약 확인'),
  @('마이페이지 수정')
)

$GuestTemplates = @(
  @('정책 확인'),
  @('노동 정보 열람'),
  @('세무 정보 열람'),
  @('회원가입')
)

$Platforms = @('Android','iOS','Web')
$Networks = @('Online','Offline')

# Filters
$includeOwner = $Roles -contains '대표'
$includeEmployee = $Roles -contains '사원'
$includeGuest = $Roles -contains '일반'

# Helper: determines if action is offline safe
function Test-OfflineSafe([string]$action) {
  $offlineSafe = @(
    '앱 실행','정책 확인','노동 정보 열람','세무 정보 열람','마이페이지 수정'
  )
  return $offlineSafe -contains $action
}

# Compose flows
$flows = New-Object System.Collections.Generic.List[string]

function Add-Flows([string]$role, [object[]]$templates) {
  foreach ($store in $Stores) {
    foreach ($tmpl in $templates) {
      # base path always starts with launch
      $base = @($LAUNCH)
      # auth segment
      if ($role -eq '일반') {
        # 일반 유저는 로그인/비로그인 둘 다 허용
        $authOptions = @($LOGIN, $GUEST)
      } else {
        $authOptions = @($LOGIN)
      }

      foreach ($auth in $authOptions) {
        $path = @($base + $auth + $role)

        # Insert store context optionally when the template requires a store
        $needsStore = ($tmpl | Where-Object { $_ -match '매장|NFC|급여|근태|소유권|임금|위치|합류|직원' }).Count -gt 0
        $postfix = @()
        if ($needsStore) {
          # normalize store naming for employee: join target store
          $postfix += "${store}"
        }
        $postfix += $tmpl

        # Network/platform expansion
        $platforms = $IncludePlatform ? $Platforms : @('')
        $platforms = $platforms | ForEach-Object { $_ } # force array
        if (-not $IncludePlatform) { $platforms = @('') }

        $networks = $IncludeNetwork ? $Networks : @('')
        if (-not $IncludeNetwork) { $networks = @('') }

        foreach ($pf in $platforms) {
          foreach ($nw in $networks) {
            # Filter offline-unsafe actions if Offline selected
            $finalActions = if ($nw -eq 'Offline') { $postfix | Where-Object { Test-OfflineSafe $_ } } else { $postfix }
            if ($finalActions.Count -eq 0) { continue }

            $segments = @()
            if ($pf) { $segments += "[$pf]" }
            if ($nw) { $segments += "{$nw}" }
            $segments += $path
            $segments += $finalActions

            $flow = ($segments -join ', ')
            $flows.Add($flow)

            if ($flows.Count -ge $MaxFlows) { return }
          }
        }

        if ($flows.Count -ge $MaxFlows) { return }
      }
      if ($flows.Count -ge $MaxFlows) { return }
    }
    if ($flows.Count -ge $MaxFlows) { return }
  }
}

if ($includeOwner)    { Add-Flows -role '대표' -templates $OwnerTemplates }
if ($flows.Count -lt $MaxFlows -and $includeEmployee) { Add-Flows -role '사원' -templates $EmployeeTemplates }
if ($flows.Count -lt $MaxFlows -and $includeGuest)    { Add-Flows -role '일반' -templates $GuestTemplates }

# De-duplicate and cap
$uniqueFlows = $flows | Select-Object -Unique | Select-Object -First $MaxFlows

# Write Markdown
$header = @()
$header += "# Sodam 사용자 플로우 자동 생성 리포트"
$header += "\n- 생성 일시: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$header += "- 최대 플로우 수: $MaxFlows"
$header += "- 포함 역할: $([string]::Join(', ', $Roles))"
$header += "- 플랫폼 포함: $IncludePlatform"
$header += "- 네트워크 조건 포함: $IncludeNetwork\n"
$header += "## 사용 방법"
$header += "```powershell"
$header += "# 10만 건 생성 예시 (파일 크기 주의)"
$header += "powershell -ExecutionPolicy Bypass -File .\\scripts\\generate-user-flows.ps1 -MaxFlows 100000 -IncludePlatform -IncludeNetwork"
$header += "\n# 대표/사원만 2만 건 생성"
$header += "powershell -ExecutionPolicy Bypass -File .\\scripts\\generate-user-flows.ps1 -MaxFlows 20000 -Roles 대표,사원 -OutFile .\\docs\\flows\\flows_owner_employee.md"
$header += "```\n"
$header += "## 표기 규칙"
$header += "- 각 플로우는 ","로 구분된 단계 나열입니다."
$header += "- 선택적으로 [플랫폼]과 {네트워크} 태그가 접두에 올 수 있습니다."
$header += "- 예: [Android], {Online}, 앱 실행, 로그인, 대표, 소담카페, 매장 생성, 직원 초대, 급여 관리\n"
$headerText = $header -join "`n"

$body = @("## 플로우 목록 (총 $($uniqueFlows.Count)건)")
$index = 1
foreach ($f in $uniqueFlows) {
  $body += ("$index. $f")
  $index++
}

Set-Content -Path $OutFile -Value @($headerText, $body -join "`n") -Encoding UTF8

Write-Host "[OK] Generated $($uniqueFlows.Count) flows -> $OutFile"
