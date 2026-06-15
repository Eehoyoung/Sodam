# Micro Design Final Spec

이 문서는 소담 리디자인의 아주 작은 UI 단위까지 최종 기준을 고정한다.  
구현 중 애매한 요소가 생기면 이 문서를 우선 기준으로 삼는다.

## 1. Touch Targets

| Element | Visual Size | Touch Size | Rule |
|---|---:|---:|---|
| Primary CTA | 52-56h | 52-56h | 화면당 1개 |
| Secondary button | 48-52h | 48-52h | primary보다 약하게 |
| Small chip button | 32-36h | 44h | hitSlop 필수 |
| Header icon | 36x36 | 44x44 | 아이콘+터치 영역 분리 |
| Tab item | 48h | 56-64h | 텍스트 2~4자 권장 |
| List row | 56h+ | 56h+ | 줄바꿈 시 자동 높이 |
| Checkbox/radio | 22-24 | 44x44 | label 전체 탭 가능 |

## 2. Header

### Default App Header

```text
height 56
left: back/menu/logo 중 하나
center: title
right: 최대 2개 icon action
background: surface.background 78% + blur
border-bottom: divider
```

### Header Title Rules

- 한 줄 고정.
- 길면 말줄임 처리.
- 화면 목적을 명사로 쓴다: `급여`, `근무 기록`, `매장 운영`.
- “관리하기”, “상세보기”처럼 불필요한 동사 남발 금지.

### Header Action Labels

| Action | Label/Icon |
|---|---|
| 알림 | `알림` 또는 bell icon |
| 저장 | `저장` |
| 편집 | `편집` |
| 필터 | `필터` |
| 검색 | search icon |
| 닫기 | close icon |

## 3. Bottom Tab

### 사장/매니저

`홈`, `매장`, `근태`, `급여`, `내정보`

### 직원

`홈`, `출퇴근`, `급여`, `정보`, `내정보`

### 개인

`홈`, `기록`, `급여`, `정보`, `내정보`

### Rules

- 5개 고정.
- 현재 탭은 오렌지.
- 비활성은 `text.tertiary`.
- 아이콘 사용 시 label은 유지한다.
- 탭 안에서 같은 탭을 다시 누르면 stack root로 이동한다.

## 4. Buttons

### Primary

- Color: `brand.primary`
- Text: white, 14-16, 800/900
- Radius: 16-18
- Shadow: primary만 허용
- Loading: label 유지 가능하면 `계산 중...`, 아니면 spinner + fixed width

### Secondary

- White background
- Navy text
- Border `border.default`
- Shadow 없음

### Destructive

- Red background or red text in confirm sheet
- 단독으로 화면 중앙에 노출 금지
- 항상 확인 단계 필요

### Disabled

- Background `surface.muted`
- Text `text.disabled`
- Opacity만으로 처리 금지

## 5. Cards

| Type | Usage | Visual |
|---|---|---|
| HeroCard | 홈 상단 핵심 요약 | navy 또는 warm, radius 22-24 |
| MetricCard | 2~3개 수치 | white, compact |
| ListCard | 반복 항목 | radius 16, border |
| WarmCard | 안내/추천 | warm bg |
| DangerCard | 위험/경고 | red bg 또는 amber bg |

Rules:
- 카드 안 카드 금지.
- 카드 제목은 1줄, 설명은 최대 2줄.
- 핵심 금액은 `numericLg`.
- 반복 리스트는 카드 간 간격 8.

## 6. Badges

| Status | Text | Color |
|---|---|---|
| 정상 | 정상 / 완료 / 승인 | green |
| 주의 | 알림 / 미출근 / 대기 | amber |
| 오류 | 누락 / 실패 / 반려 | red |
| 정보 | 보기 / 설정 / 준비중 | blue |

Rules:
- 배지 텍스트는 2~4자 권장.
- 색만으로 의미 전달 금지.
- 리스트 오른쪽에 배치.

## 7. Inputs

### Default

- Height 48
- Radius 15
- Border `border.default`
- Focus border `brand.primary`
- Placeholder `text.tertiary`
- Label은 field 위 또는 field 내부 둘 중 화면별 통일

### Error

- Border red
- Error text below, 12px
- 한 화면의 오류는 최초 오류 위치로 scroll

### Helper Text

- 시급, 위치 반경, 비밀번호처럼 사용자가 헷갈리는 입력에만 제공.
- 문장은 짧게: “8자 이상 입력해 주세요.”

## 8. Forms

### Keyboard

- 모든 입력 화면은 키보드가 CTA를 가리면 안 된다.
- 하단 CTA는 `CtaStack` 또는 scroll bottom padding으로 예약한다.

### Validation Timing

- 입력 중 실시간 검증: 이메일 형식, 비밀번호 길이.
- 제출 시 검증: 약관, 사유, 날짜 범위.

## 9. Toasts

### Position

- Bottom tab 위 12px.
- 하단 CTA가 있으면 CTA 위 12px.
- Duration 2.2s.

### Style

- Dark surface, white text.
- Success icon optional.
- 1줄 권장, 최대 2줄.

### Standard Toasts

| Situation | Copy |
|---|---|
| 초대 코드 복사 | 초대 코드를 복사했어요 |
| 추천 코드 복사 | 추천 코드를 복사했어요 |
| 저장 완료 | 저장했어요 |
| 알림 설정 변경 | 알림 설정을 바꿨어요 |
| 로그아웃 | 로그아웃했어요 |
| 정보 저장 | 나중에 볼 수 있게 저장했어요 |
| 오프라인 저장 | 연결되면 자동으로 다시 보낼게요 |

## 10. Bottom Sheets

### Layout

```text
handle
title
description optional
content
primary CTA
secondary/cancel
safe-area bottom padding
```

### Heights

- Action sheet: content height
- Form sheet: 60-86vh
- Confirm sheet: content height, max 420

### Rules

- 닫기 제스처 허용.
- 위험 액션은 primary가 아니라 destructive 스타일.
- 입력 sheet는 keyboard safe.

## 11. Modals

사용처:
- NFC scan
- QR scan
- 계정 탈퇴 다단계
- PDF preview

Rules:
- 전체 화면 modal은 명확한 닫기 버튼이 있어야 한다.
- 시스템 권한 전에는 자체 primer를 먼저 보여준다.

## 12. Loading

| Context | Pattern |
|---|---|
| Button submit | 버튼 내부 spinner + disabled |
| Full screen boot | centered mark + message |
| List load | skeleton row 3개 |
| Payroll calculation | progress text + fixed card |

Copy:
- “확인하고 있어요”
- “급여를 계산하고 있어요”
- “매장 상태를 불러오고 있어요”

## 13. Empty States

Formula:

```text
아직 {대상}이 없어요
{사용자가 해야 할 다음 행동}
[CTA]
```

Examples:
- 아직 직원이 없어요 / 초대 코드를 보내 첫 직원을 추가하세요 / 직원 초대하기
- 아직 급여 내역이 없어요 / 첫 정산을 실행하면 여기에 쌓여요 / 급여 정산 시작
- 아직 근무지가 없어요 / 내가 일하는 곳을 등록하고 시간을 기록하세요 / 근무지 추가

## 14. Error States

| Error | Title | CTA |
|---|---|---|
| network | 잠시 연결이 불안정해요 | 다시 시도 |
| permission | 권한이 필요해요 | 권한 켜기 |
| validation | 입력을 확인해 주세요 | 해당 필드 focus |
| server | 처리하지 못했어요 | 다시 시도 |
| not found | 찾을 수 없어요 | 이전 화면으로 |

## 15. Permission Primers

### Location

Title: 위치 권한이 필요해요  
Description: 매장 근처에서 출근했는지 확인하기 위해 현재 위치를 확인합니다.  
Primary: 권한 켜기  
Secondary: 사장님께 수동 요청

### Camera

Title: QR 스캔에 카메라가 필요해요  
Description: 사장님이 보여준 초대 QR을 읽기 위해 카메라를 사용합니다.  
Primary: 카메라 켜기  
Secondary: 코드 직접 입력

### NFC

Title: NFC를 켜 주세요  
Description: 매장 태그에 휴대폰을 대면 출근이 자동으로 처리됩니다.  
Primary: NFC 설정 열기  
Secondary: GPS로 출근하기

## 16. Money and Time Formatting

| Value | Format |
|---|---|
| amount card | `2,418,000원` |
| compact amount | `241만` |
| hourly wage | `10,500원` |
| duration | `5h 30m` or `03:12:09` |
| date | `2026.05.25` |
| month | `2026년 5월` |

Rules:
- 금액은 우측 정렬 또는 큰 카드 중앙.
- 시간 타이머는 tabular numerals.
- 급여 breakdown은 `+`, `-` 부호를 명확히 표시.

## 17. Screen-Specific Tiny Details

### OwnerHome

- 예외가 1개 이상이면 HeroCard CTA는 예외 처리로 고정.
- 예외가 없으면 CTA는 급여 정산 또는 직원 초대.
- 직원 row는 이름, 상태, 다음 행동 배지를 가진다.

### StoreDetail

- 초대 코드는 항상 복사 가능한 형태.
- 직원이 0명이면 직원 리스트 대신 EmptyState.
- 위치 미설정이면 StoreEdit보다 위치 설정 CTA 우선.

### PayrollRun

- 미완료 출퇴근이 있으면 발급 CTA 비활성.
- 가감 조정은 반드시 사유 필요.
- 발급 후 24시간 취소 가능 안내는 confirm sheet에 표시.

### EmployeeAttendanceHome

- 매장이 없으면 출근 CTA를 보여주지 않는다.
- 근무 중에는 타이머가 최상위 정보.
- 퇴근 확인 sheet에는 오늘 예상 일급을 보여준다.

### PersonalHome

- 개인 기록은 승인/정정 개념을 쓰지 않는다.
- 직접 수정, 수동 기록, 휴게 타이머를 우선한다.

## 18. Motion

| Interaction | Motion |
|---|---|
| Button press | scale 0.97, 120ms |
| Sheet open | bottom slide 240ms |
| Toast | fade/slide up 180ms |
| Punch success | soft scale + check 300ms |
| Tab change | no heavy animation |

Motion은 감탄 포인트지만 기능보다 앞서면 안 된다.

## 19. Final QA

모든 화면/상태/팝업은 아래 조건을 통과해야 한다.

- 320px 폭에서 가로 스크롤 없음.
- 200% 텍스트 배율에서 주요 CTA가 보인다.
- 하단 CTA가 홈 인디케이터에 가리지 않는다.
- 스크롤 가능한 화면은 마지막 항목이 tab/CTA 뒤에 숨지 않는다.
- 긴 사업장명/직원명은 말줄임 또는 줄바꿈 처리된다.
- 금액은 줄바꿈되어도 의미가 깨지지 않는다.
- 오류, 빈 상태, 로딩 상태가 모두 존재한다.
