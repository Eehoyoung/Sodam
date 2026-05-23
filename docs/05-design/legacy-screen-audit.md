# 레거시 화면 토큰화 감사 — `sodam-designer` 산출물

> 출시 전 토큰 일관성 회귀 패치 — 우선순위순 정리.
> P0 화면 5개는 즉시 토큰화, P1 화면 6개는 출시 후 30일 내.

## 우선순위 P0 (출시 차단 사장님 진입 빈도 高)

### 1. LoginScreen.tsx
**주요 위반**
- 다수의 `COLORS.SODAM_*` 직접 사용 — `tokens.colors.*` 로 치환
- `paddingVertical: 13` 같은 매직 넘버 → `spacing.md` (12) 또는 `spacing.lg` (16)
- 비밀번호 토글 아이콘 hardcoded color → `tokens.colors.textSecondary`

**권장 패치** (Layered approach)
- 1단계: 컬러 import 만 `tokens` 로 변경 (1h)
- 2단계: 공용 `Button` / `Input` 컴포넌트 치환 (3h)
- 3단계: 레이아웃 spacing 토큰화 (1h)

### 2. SignupScreen.tsx
**주요 위반**
- 약관 동의 UI 누락 — 본 자율 패스에서 `ConsentBlock` 컴포넌트 생성 완료 → SignupScreen 에 통합 필요
- 컬러 hardcoded
- 비밀번호 강도 표시 없음 — `checkPassword` 유틸 import 후 PasswordResetScreen 패턴 재사용

**권장 패치**
- `ConsentBlock` import + 가입 form 하단 배치
- joinPayload 에 `ageConfirmed`/`termsAgreed`/`privacyAgreed`/`marketingAgreed` 전달

### 3. HomeScreen.tsx
**현재 상태**: 비회원/마케팅 페이지 성격이 강함.
- 그라디언트 hero 섹션은 보존
- 카드는 `<Card>` 컴포넌트로 단계적 교체
- 색상 → `tokens.colors.brandPrimary`
- 인증 상태에 따라 `OwnerDashboardScreen` 으로 리다이렉트 분기 권장

### 4. AttendanceScreen.tsx
**주요 위반**
- NFC/GPS 모드 별 UI 분리 — `EmployeeAttendanceHome` 와 합치는 게 더 명확
- 현재는 메인 메뉴 진입점으로 사용 — 큰 동그라미 CTA (`EmployeeAttendanceHome`) 패턴이 더 유효
- 권장: `EmployeeAttendanceHome` 을 메인으로 승격, `AttendanceScreen` 은 기록 조회 전용으로 분리

### 5. SalaryListScreen.tsx
**주요 위반**
- 명세서 카드 hardcoded color
- 상태 배지 색 — `Badge` 컴포넌트로 통일

**권장 패치**
- `<Card>` + `<Badge>` 사용
- PRD_OWNER S-301 (PayrollRun) 진입점 추가

## 우선순위 P1 (출시 후 30일)

### 6. StoreRegistraionScreen.tsx
- 다단계 마법사 UX 권장 (사업자번호 → 매장정보 → 위치 → 시급)
- ProgressBar 추가
- 컬러 토큰화

### 7. MyPage 4종 (Personal/Employee/Manager/Master)
- 4개 화면 중복 패턴이 많음
- 공통 `<MyPageScaffold>` 추출 권장
- 역할별 액션 카드만 분기

### 8. WorkplaceList / WorkplaceDetail
- StoreDetail 과 역할 중복 — 리팩토링 시 합칠 수 있음
- 토큰화

### 9. Welcome 3종 (Welcome / HybridMain / UsageSelection)
- 온보딩 캐러셀(`OnboardingCarouselScreen`) 으로 대체된 영역 정리
- WelcomeMain 만 유지, 나머지 deprecate 후보

### 10. SubscribeScreen ✅ 완료
- 본 자율 패스에서 이미 토큰화 완료

### 11. SalaryDetailScreen
- 명세서 상세 — 자릿수 콤마, tabular-nums 적용
- 인쇄 가능한 형태 권장 (Phase 1 발급 PDF 도입 후)

## 자동화 회귀 점검 스크립트 (선택)

```bash
# 하드코딩 색상 검출
grep -rn "#[0-9A-Fa-f]\{3,6\}" frontend/src --include="*.tsx" --include="*.ts" \
  | grep -v "src/theme/tokens.ts" \
  | grep -v ".test." \
  | grep -v "//"
```

## 점검 합격 기준
- [ ] 하드코딩 색상 사용 0개 (tokens.ts 제외)
- [ ] 매직 넘버 (마진/패딩) 사용 0개
- [ ] 공용 컴포넌트(Button/Card/Badge/Input) 사용률 80%+
- [ ] 모든 인터랙티브 요소 minHeight ≥ 44
- [ ] 빈/로딩/에러 상태 모두 노출
- [ ] 사용자 텍스트에 금지어 미포함
