# 화면 디자인/레이아웃 품질 진단 보고서

- 일자: 2026-05-24
- 범위: Welcome / Signup / Login + 공통 패턴
- 작업자: Claude (자동 진단)
- 수정 권한: 보고만 (수정은 메인 세션에서 진행)

---

## 1. Welcome 화면 (`features/welcome/screens/WelcomeMainScreen.tsx`)

| # | 분류 | 발견 사항 |
|---|------|-----------|
| W-01 | **P0** | `bottomSection`이 `position: 'absolute', bottom: 40` 으로 고정 — `SafeAreaView` 내부지만 노치/제스처 바 디바이스(iPhone 14 등)에서 `loginButton`(buttonSection)과 **겹칠 위험**. 화면 높이가 짧은 기기(iPhone SE, 갤럭시 폴드 외부 화면)에서는 brand 로고/타이틀과 충돌 가능. |
| W-02 | **P0** | `Dimensions.get('window')` 21번째 줄에서 호출만 하고 **결과를 변수에 담지도, 사용하지도 않음** (no-op). 반응형 의도가 있었으나 미완료. `fontSize: 48`, `marginBottom: 60` 등 모두 고정 픽셀. 작은 기기에서 비율 깨짐 발생. |
| W-03 | **P1** | `tokens.ts` 시그니처 컬러 `#FF6B35` 와 동일 값이지만 **`COLORS.SODAM_ORANGE` (logo/Colors.ts) 를 import** — 토큰 시스템을 우회. `tokens.colors.brandPrimary` 로 통일 필요. `tokens.` 사용은 0회. |
| W-04 | **P1** | 그라디언트가 **4색**(`SODAM_ORANGE → #FF8A65 → #42A5F5 → SODAM_BLUE`)이라 톤이 분산. 브랜드 가이드(`tokens.gradient.brand = ['#FF7A1A', '#FF5722']`) 2색 톤과 불일치. "디자인이 구리다"고 느끼는 1순위 원인일 가능성 높음. |
| W-05 | **P1** | `signupButton`이 반투명 화이트(`rgba(255,255,255,0.1)`) — 그라디언트 배경에서 거의 비침. CTA 위계가 약함. 회원가입이 1차 CTA여야 하는데 로그인 버튼이 더 강함. |
| W-06 | **P2** | `brandSubtitle` ("소상공인을 담다") 와 `brandDescription` ("디지털과 연결하다") 사이 행간 4px — 타이포 박자가 부자연. |
| W-07 | **P2** | `shadowOpacity: 0.3` + `elevation: 8` 이 흰 로고에 적용됨 — 안드로이드에서 사각형 그림자 누출(square shadow leak) 발생 가능. |

### 권장 수정 스니펫 (W-01, W-02)

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

const insets = useSafeAreaInsets();
const { height } = useWindowDimensions();
const isCompact = height < 700; // iPhone SE / 작은 안드로이드

// styles
content: {
    flex: 1,
    justifyContent: 'space-between', // 'center' 대신 — 자동 분배
    paddingHorizontal: 24,
    paddingTop: isCompact ? 40 : 80,
    paddingBottom: insets.bottom + 24, // absolute 제거
},
bottomSection: {
    // position: 'absolute' 제거 → flex 흐름으로
    alignItems: 'center',
    marginTop: 16,
},
brandName: { fontSize: isCompact ? 36 : 48, ... },
```

---

## 2. Signup 화면 (`features/auth/screens/SignupScreen.tsx`)

| # | 분류 | 발견 사항 |
|---|------|-----------|
| S-01 | **P0** | **`KeyboardAvoidingView` 부재** — 비밀번호 입력 시 키보드가 입력창/약관 동의/가입 버튼을 가림. LoginScreen에는 적용되어 있어 일관성도 깨짐. |
| S-02 | **P0** | `formCard`가 `marginTop: -20` + `marginHorizontal: 20` (ScrollView 내부의 또 다른 가로 여백) 인데 `scrollContent`도 `paddingHorizontal: 24` → **양쪽 여백 44px** 누적되어 카드가 비정상적으로 좁아짐. 사용자가 말한 "비율 이상"의 직접 원인. |
| S-03 | **P0** | `SafeAreaView`로 감쌌지만 `ScrollView`의 `contentContainerStyle`에 `paddingTop` 없음 → 헤더의 `paddingTop: 40` 이 상태바와 겹칠 위험 (Android translucent statusbar 시). |
| S-04 | **P1** | `userType.id === 'employee'` 카드 색상이 **`COLORS.SODAM_GREEN` = `#A23B72`** — 이름은 그린인데 실제로는 **마젠타**. `backgroundColor: '#FDF2F8'` (핑크)와 충돌. `Colors.ts` 정의 자체가 잘못됨 (그린이 아닌 핑크/마젠타). |
| S-05 | **P1** | 선택된 카드의 `radioInner`는 `SODAM_ORANGE`인데, 카드 `borderColor`는 카드별 색(`success/SODAM_BLUE/SODAM_GREEN`) — **색 충돌**. 브랜드 일관성: 라디오는 전부 brand orange로 통일하거나 모든 카드 색을 brand 1색으로. |
| S-06 | **P1** | `sectionTitle: { textAlign: 'center' }` — 입력 폼 섹션 제목까지 가운데 정렬. 폼 라벨은 좌측이 표준 (G-007 와이어프레임도 좌측 정렬 가정). |
| S-07 | **P1** | 비밀번호 강도 표시(`▓▓▓▓░░░░ 강도: 보통`)가 와이어프레임 G-007에 명시됐으나 **미구현**. |
| S-08 | **P1** | `ConsentBlock`은 `tokens.*` 사용 (모범) 인데, 컨테이너 SignupScreen은 `COLORS.*` 사용 — 같은 화면 내 **두 디자인 시스템 혼재**. 글자색·간격이 미세하게 어긋남. |
| S-09 | **P2** | "가입하기" 버튼이 항상 활성 (`disabled`는 isLoading만 봄). 와이어프레임 G-007 §상태: "필수 미동의 → 가입 버튼 비활성" 요구 미충족. UX 피드백 약함. |
| S-10 | **P2** | `userTypeIcon`에 이모지(🏠🏢👥) 사용 — 안드로이드 13+ 이모지 렌더링이 iOS와 다르게 보임 + 디자인 일관성 약함. Ionicons 권장. |

### 권장 수정 스니펫 (S-01, S-02)

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
>
    <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
    >
        {/* ... */}
    </ScrollView>
</KeyboardAvoidingView>

// styles — 카드 가로 여백 일원화
scrollContent: {
    paddingHorizontal: 20, // 단일 소스
    paddingTop: 24,
    paddingBottom: 40,
},
formCard: {
    // marginHorizontal 제거, marginTop -20 유지 OK
    marginTop: -20,
    borderRadius: 24,
    padding: 24, // 30 → 24 (좁은 화면 대응)
},
```

---

## 3. 공통 패턴 점검

### 디자인 토큰 사용률
- `tokens.*` 사용: **31개 파일, 총 764회** (양호한 베이스)
- 하드코딩 `#RRGGBB` 색상: **72개 파일, 총 566회** (과다)
- `tokens.ts` 와 `common/components/logo/Colors.ts` **두 시스템이 병행** — 후자가 레거시. 신규 화면(SignupScreen 등)도 여전히 `COLORS.*` 사용 중. **단일화 마이그레이션 필요**.
- **SODAM_GREEN 변수명 ≠ 실제 색(#A23B72 마젠타)** 이라 신규 작업자가 매번 잘못 사용.

### 반응형 처리
- `Dimensions.get('window')` / `useWindowDimensions` 사용 19개 파일.
- 하지만 WelcomeMainScreen은 호출만 하고 **결과를 사용 안 함** (dead code). 대부분 화면은 고정 픽셀 사용.
- 작은 기기(iPhone SE 4.7", 갤럭시 폴드 외부) 대응 코드 거의 없음.

### 폰트
- 커스텀 폰트 없음 (tokens.ts 의도대로 시스템 폰트). OK.
- 단, `fontWeight: 'bold'` vs `'600'` vs `'700'` 혼재. tokens.typography.weights 미사용 화면 다수.

### KeyboardAvoidingView
- 입력 폼을 가진 화면 중 적용된 곳: **LoginScreen, PasswordResetScreen만**.
- 미적용: **SignupScreen**, AccountSettingsScreen, WageSettingsScreen, JoinStoreByCodeScreen, AttendanceCorrectionRequestScreen, TimeOffRequestScreen 등 다수.

### HybridMainScreen
- "Hello World" 디버그 코드 그대로 (`HybridMainScreen.tsx`). 프로덕션 진입 가능한 라우트면 **출시 차단**.

---

## 4. 우선순위 요약

### P0 (사용 불가능 / 즉시 수정)
- **W-01** Welcome bottomSection 안전영역 침범 + buttonSection 겹침 위험
- **W-02** Dimensions dead-code + 고정 픽셀 (작은 기기 비율 깨짐)
- **S-01** Signup KeyboardAvoidingView 부재 → 입력 가림
- **S-02** Signup 카드 좌우 패딩 중복 누적 (44px) → 사용자 체감 "비율 이상"
- **S-03** Signup SafeArea / 상태바 침범 가능성

### P1 (어색·일관성 깨짐)
- W-03, W-04, W-05, S-04, S-05, S-06, S-07, S-08

### P2 (개선시 좋음)
- W-06, W-07, S-09, S-10

---

## 5. 추가 권장

1. **`Colors.ts` deprecate 마이그레이션** — codemod로 `COLORS.SODAM_ORANGE → tokens.colors.brandPrimary` 일괄 치환 (가장 큰 임팩트, 1회 작업).
2. **공통 `<ScreenContainer>` 컴포넌트 도입** — SafeArea + KeyboardAvoidingView + ScrollView + 기본 padding을 한 번에 처리. 신규 화면은 무조건 사용.
3. **반응형 헬퍼 보강** — `utils/responsive.tsx` 존재 확인. WelcomeMainScreen / SignupScreen 등 1순위 화면부터 적용.
4. **HybridMainScreen 정리** — 디버그 코드는 별도 dev-only 라우트로.

---

**보고서 끝**
