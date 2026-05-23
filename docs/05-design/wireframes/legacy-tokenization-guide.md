# 레거시 화면 토큰화 가이드 (D0/W2)

## 대상 화면 (9개)
LoginScreen, SignupScreen, HomeScreen, AttendanceScreen, SalaryListScreen, SalaryDetailScreen, StoreRegistraionScreen, MyPage 4종, Workplace 2종, Welcome 3종.

## 일괄 변환 룰

### 1. 색상 치환표
| 기존 | → | 새 (tokens.colors.*) |
|---|---|---|
| `#007AFF` `#3498db` `#4F46E5` `#4A6FFF` | → | `brandPrimary` |
| `COLORS.SODAM_BLUE` | → | `brandPrimary` |
| `COLORS.SODAM_ORANGE` | → | `brandPrimary` (이미 #FF6B35) |
| `#FFFFFF` `#FFF` `white` | → | `background` |
| `#000` `#000000` `#212529` | → | `textPrimary` |
| `#8E8E93` `#6C757D` `#C7C7CC` | → | `textTertiary` |
| `#E5E5EA` `#E9ECEF` | → | `border` |
| `#FF3B30` `#e74c3c` | → | `error` |
| `#28A745` `#2ecc71` | → | `success` |
| `#FFC107` `#f39c12` | → | `warning` |
| `#F2F2F7` `#F8F9FA` | → | `surfaceMuted` |

### 2. 간격 치환표
| 기존 (px) | → | tokens.spacing |
|---|---|---|
| 4 | xs |
| 8 | sm |
| 12 | md |
| 16 | lg |
| 20 | xl |
| 24 | xxl |
| 32 | xxxl |

### 3. 폰트 크기 치환표
| 기존 | → | tokens.typography.sizes |
|---|---|---|
| 12 | xs |
| 13~14 | sm |
| 15~16 | md |
| 17~18 | lg |
| 20~22 | xl |
| 24~28 | xxl |
| 30+ | display |

### 4. 라운드 치환표
| 기존 | → | tokens.radius |
|---|---|---|
| 4 | sm |
| 8 | md |
| 12 | lg |
| 16 | xl |
| 100, 999 | pill |

### 5. 컴포넌트 사용 권장
- `<TouchableOpacity>` 단순 버튼 → `<Button>` 컴포넌트
- `<View>` + border + shadow 카드 → `<Card>`
- 상태 표시 → `<Badge>`
- `<TextInput>` 라벨 포함 → `<Input>`

## 디자인 회귀 점검 (병합 전 자가체크)
- [ ] 하드코딩 `#XXXXXX` 0개 (정규식 `#[0-9A-Fa-f]{3,6}` 검색)
- [ ] 매직넘버 px 검사 (`paddingXxx: 7`, `marginTop: 13` 등 — 토큰 사이 값)
- [ ] 흰 글자 + 흰 배경 등 대비 0 검사
- [ ] 터치 가능 요소 minHeight ≥ 44
- [ ] 텍스트 라벨에 "혁신/AI/스마트" 미포함
- [ ] 빈 상태/로딩/에러 UI 있음

## 우선순위
1. **LoginScreen, SignupScreen** — 첫 인상
2. **HomeScreen** — 사장님 진입 빈도 1위
3. **AttendanceScreen** — 직원 진입 빈도 1위
4. SalaryList/Detail, StoreRegistration, MyPage 4종, Workplace, Welcome
