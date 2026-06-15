# Responsive, Accessibility, QA

## Breakpoints

| Name | Width | Use |
|---|---:|---|
| `compact` | `< 360` | 작은 Android, 긴 텍스트 압축 |
| `normal` | `360-430` | 기본 모바일 |
| `wide` | `431-767` | 큰 모바일/폴더블 커버 |
| `tablet` | `>= 768` | 2열 가능 |

높이 기준:
- `compactHeight`: `< 700`
- 큰 원형 CTA, hero, 하단 CTA는 높이 compact에서 축소 또는 스크롤 처리한다.

## Layout Rules

- 모든 화면은 `ScreenContainer` 기준으로 SafeArea, KeyboardAvoiding, Scroll을 통제한다.
- 하단 고정 CTA는 `CtaStack`으로 bottom inset을 예약한다.
- `position: absolute`로 CTA 고정 금지.
- `Dimensions.get()` 모듈 레벨 호출 금지.
- 화면 폭 기반 글자 크기 scaling 금지.
- 텍스트는 200% 배율에서 버튼/카드 밖으로 나가지 않아야 한다.

## Touch and Accessibility

- 모든 터치 요소 최소 44x44.
- 작은 버튼은 시각 높이가 36이어도 `hitSlop`으로 44 확보.
- 터치 카드에는 `accessibilityRole`, `accessibilityLabel`, `accessibilityState`를 제공한다.
- 선택 카드/라디오는 selected state를 제공한다.
- 로딩 버튼은 busy state를 제공한다.
- 색만으로 상태를 전달하지 않는다.
- `Alert`만 쓰지 말고 화면 내 오류 텍스트도 제공한다.

## State Screens

### EmptyState

나쁜 예: “데이터가 없습니다.”  
좋은 예: “아직 등록된 직원이 없어요. 초대 코드를 보내 첫 직원을 추가하세요.”

필수:
- 아이콘
- 제목
- 설명
- 다음 행동 CTA

### ErrorState

유형:
- network
- permission
- server
- validation
- notFound

필수:
- 원인
- 사용자가 할 수 있는 다음 행동
- 재시도/설정 이동/문의 CTA

### LoadingState

유형:
- full
- section
- button

규칙:
- skeleton 또는 고정 높이 사용
- 로딩 중 레이아웃 점프 금지

## QA Matrix

| 화면 | 360x640 | 390x844 | 430x932 | 768x1024 | 200% Text | Keyboard |
|---|---|---|---|---|---|---|
| RoleStart | 필수 | 필수 | 필수 | 권장 | 필수 | 해당 없음 |
| Login/Signup | 필수 | 필수 | 필수 | 권장 | 필수 | 필수 |
| OwnerHome | 필수 | 필수 | 필수 | 필수 | 필수 | 해당 없음 |
| StoreRegistration | 필수 | 필수 | 필수 | 권장 | 필수 | 필수 |
| StoreDetail | 필수 | 필수 | 필수 | 필수 | 필수 | 해당 없음 |
| EmployeeHome | 필수 | 필수 | 필수 | 권장 | 필수 | 해당 없음 |
| AttendanceCalendar | 필수 | 필수 | 필수 | 권장 | 필수 | 해당 없음 |
| PayrollRun | 필수 | 필수 | 필수 | 필수 | 필수 | 필수 |
| PersonalHome | 필수 | 필수 | 필수 | 권장 | 필수 | 해당 없음 |

## Launch Gate

- 앱 첫 진입 후 역할 선택까지 1탭
- 역할 선택 후 가입/로그인까지 1탭
- 직원 출근까지 3탭 이하
- 사장 매장 등록까지 3단계 이하
- 월말 정산은 3단계 구조 유지
- 모든 주요 액션에 성공/실패/빈 상태 존재
