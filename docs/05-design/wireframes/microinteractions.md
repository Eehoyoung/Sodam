# 마이크로 인터랙션 가이드 — `sodam-designer` 산출물

> 모든 화면 공통 — UX 디테일이 브랜드 가치를 만든다.

## 1. 화면 전환

| 종류 | 권장 | 비고 |
|---|---|---|
| Stack push | iOS 슬라이드 / Android 페이드 + 슬라이드 | RN Stack 기본값 |
| Stack pop | 뒤로 슬라이드 | swipeable 활성 |
| Modal/BottomSheet | 아래에서 위로 슬라이드 200ms | spring tension 80 |
| 토스트 | 위에서 슬라이드 다운, 3s 후 자동 닫힘 | shadow.lg |
| Tab 전환 | crossfade 150ms | LinearGradient 인디케이터 |

## 2. 진입 애니메이션 (화면별)

| 화면 | 진입 효과 |
|---|---|
| Splash | logo scale 0.9→1 spring + slogan opacity 0→1 delay 500ms |
| OnboardingCarousel | 슬라이드 spring |
| OwnerDashboard | 카드 staggered FadeInUp 80ms 간격 |
| EmployeeAttendanceHome | 동그라미 CTA scale 0.8→1 spring |
| SubscribeScreen | 카드 staggered FadeIn |
| NotificationCenter | 리스트 무한 스크롤, 새 아이템 SlideInTop |

## 3. 액션 피드백

### 햅틱 (react-native-haptic-feedback 도입 후)
- **light** (1Hz pulse): Tab 전환, Toggle on/off, 카드 선택
- **medium**: Primary CTA 탭, 결제 진행
- **success**: 출근 등록 완료, 결제 성공, 명세서 발급 완료
- **warning**: GPS 범위 밖, 운영시간 외
- **error**: 입력 검증 실패, 결제 실패

### 시각 피드백
| 인터랙션 | 효과 |
|---|---|
| Button press | scale 0.97 (이미 적용) |
| Card press | scale 0.99 (이미 적용) |
| 입력 검증 실패 | 보더 → red, 진동 흔들기 (translateX ±5px × 3) |
| 토글 on | brand color filling 좌→우 swipe |
| 새 알림 도착 | 종 아이콘 회전 -10° → +10° → 0° 200ms |

## 4. 성공 상태

### 출근 완료 (EmployeeAttendanceHome)
```
1. 동그라미 → success 그라디언트로 fade
2. 햅틱 success
3. 중앙 ✓ 표시 800ms 후 사라짐
4. 타이머 카운트업 자동 시작
```

### 결제 성공 (SubscribeScreen)
```
1. 결제 버튼 loading → 성공 시 ✓ scale spring
2. 화면 confetti 2초 (react-native-confetti-cannon — 외주 일러스트 도착 후)
3. 1.5초 후 자동 모달 닫힘 → 홈 이동
```

### 명세서 발급 (PayrollRun Step 3)
```
1. "발급하기" → progress 100%
2. ✓ + 햅틱 success
3. "직원에게 알림 전송됐어요" 토스트 3초
4. 자동 home 이동
```

## 5. 에러 상태

### 네트워크 끊김
- 상단 노란 배너 + 아이콘 ⚠️ "오프라인 모드 — 자동 동기화 대기 중"
- 출퇴근 큐 항목 수 노출 ("3건 동기화 대기")

### 401 / 토큰 만료
- Refresh interceptor 자동 처리 (api.ts 이미 구현)
- 실패 시 LoginScreen 으로 reset + 토스트

### 5xx
- 토스트 "잠시 후 다시 시도해 주세요 — 우리 잘못이에요"
- Sentry 자동 보고

## 6. 빈 상태 (Empty States)

| 화면 | 카피 | 이모지 |
|---|---|---|
| OwnerDashboard - 직원 0 | "아직 직원이 없어요.\n첫 직원을 초대해 볼까요?" | 🧑‍🤝‍🧑 |
| OwnerDashboard - 매장 0 | "첫 매장을 등록해 볼까요?" | 🏪 |
| EmployeeAttendanceHome - 매장 미가입 | "소속 매장이 아직 없어요 — 매장 코드를 받으셨나요?" | 🎫 |
| SalaryListScreen - 명세서 0 | "이번 달은 아직 정산되지 않았어요." | 📃 |
| AttendanceCalendar - 데이터 0 | "이번 달 출근 기록이 없어요." | 📅 |
| NotificationCenter - 알림 0 | "받은 알림이 없어요." | 📭 |
| InfoList - 검색 결과 0 | "찾으시는 정보가 없어요.\n다른 키워드로 찾아볼까요?" | 🔍 |
| EmployeeDetail.SalaryTab - 0 | "발급된 급여 명세서가 없어요." | 💰 |

## 7. 로딩 상태

- 0~150ms: 표시 X (깜빡임 방지)
- 150~800ms: 스피너 (ActivityIndicator brandPrimary)
- 800ms+: 스켈레톤 카드 (회색 빈 박스 3~5개)
- 5초+: "오래 걸리네요. 잠시만 더 기다려 주세요" 텍스트 추가

## 8. 입력 폼

- 자동 포커스: 첫 빈 필드
- 자동 다음 필드 이동: TextInput returnKeyType="next" / onSubmitEditing
- 키보드 종류: 이메일=email-address, 비번=default+secureTextEntry, 숫자=number-pad
- 자동완성: 이메일 textContentType="emailAddress", 비번 textContentType="password"
- OTP: textContentType="oneTimeCode" + autoComplete="one-time-code"

## 9. 접근성

- 모든 인터랙티브: minHeight 44 / accessibilityRole / accessibilityLabel
- 색상으로만 상태 구분 X — 아이콘 또는 텍스트 병행
- 다크 모드 대응: tokens 만 swap (Phase 2)
- 동적 폰트 크기 대응 (Phase 2)
