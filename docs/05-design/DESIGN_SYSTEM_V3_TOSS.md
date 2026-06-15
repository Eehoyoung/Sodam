# 소담 디자인 시스템 v3 — "토스식" 전면 재디자인 스펙 (구현용)

> 근거: `docs/05-design/디자인-AI-브리프.md`(방향) + `frontend/src/theme/tokens`(토큰). 이 문서는 **구현 기준**이다.
> 원칙 한 줄: **한 화면 = 한 가지 · 숫자가 히어로 · 압도적 여백 · 하단 풀폭 CTA 1개 · 진행형 스텝.** 올드·과밀 전면 거부.

## A. 완료 조건 (DoD — 전부 충족까지 루프, 미충족이면 반복)
1. DS v3 파운데이션 컴포넌트 업그레이드(아래 §C) — props API 유지, tsc/jest/eslint green.
2. **모든 기능 화면**(59개, §E 클러스터)이 v3 언어로 재디자인(한화면1가지·히어로숫자·여백 24~40·하단CTA1·스텝). 레거시 COLORS/하드코딩색 0(토큰만)·다크모드 동작.
3. 매 단계 게이트 green: BE `./gradlew test`(268) · FE `npx tsc --noEmit`(0) · `npx jest`(0 fail) · `npx eslint . --ext .ts,.tsx`(0 error).
4. 본 스펙 + `세션-작업-현황.md` 동기화 + 트랙별 로컬 커밋.

## B. 비주얼 토큰 (tokens 유지·강조)
- Primary `#FF6B35`(1차 CTA·강조 전용, 남용 금지) · Secondary 네이비 `#243B4A` · Accent `#F4A261`.
- 캔버스 `#F7F4EF` · 카드 `#FFFFFF`/따뜻 `#FFFBF5` · 텍스트 `#201A17`/`#625B55`/`#9A9189`.
- 시맨틱 성공 `#12A87B`/경고 `#F59E0B`/오류 `#E5484D`. 다크모드 토큰 그대로 사용.
- 그림자: 네이비톤 소프트. **테두리보다 여백·그림자로 구분**.

## C. 파운데이션 컴포넌트 (W1 — 먼저, 모든 화면의 기반)
- **AppButton**: 높이 56, radius 18, weight 700, 풀폭. primary=오렌지+소프트섀도, secondary=네이비 outline, ghost=텍스트. press scale .975. 화면당 primary 1개.
- **AppText**: 타입 스케일 유지 + **`AmountText`(금액 전용: 28~52px, weight 800, letter-spacing -1, tabular, numberOfLines=1 adjustsFontSizeToFit)** 추가.
- **HeroNumber**(신규): 라벨(작게) + 거대 숫자(40~56) + 보조 한 줄. 화면 상단 히어로용. (선택)카운트업.
- **AppCard**: padding 20, radius 20, 그림자 기반(테두리 약하게/제거). variant: plain/warm/hero.
- **ScreenContainer**: 기본 패딩 좌우 24·상 28, **하단 고정 CTA 슬롯**(`footer`) 지원 + 안전영역.
- **StepScaffold**(신규): 진행바 + 큰 질문(28/800) + 한 입력 + 하단 CTA. 가입·정산·설정 스텝용.
- **AppListItem**: 큰 터치(min 56), 좌 라인아이콘 + 제목(numberOfLines 1) + 우 값/›. 이모지 금지(Ionicons).
- **SegmentedControl/Chip**: 선택=오렌지, 가로 스크롤 허용.

## D. 화면 레이아웃 규칙 (W2 — 모든 화면 공통)
1. 화면 진입 시 **핵심 수치/1차 행동**이 한눈에. 나머지는 스크롤/다음 화면.
2. 상단 인사·맥락 → 히어로(숫자/액션) → 보조 1~2 → **하단 풀폭 CTA 1개**.
3. 여백: 섹션 간 24~40, 카드 내 20. 빽빽하면 분해.
4. 긴 폼 → **StepScaffold 다단계**(한 번에 하나 묻기).
5. 빈/로딩/에러 = 친근한 한 줄 + 다음 행동(StateViews).
6. 금액·매장명·직원명 = numberOfLines/adjustsFontSizeToFit (잘림 0).
7. 이모지 UI 아이콘 → Ionicons 라인 아이콘.

## E. 화면 클러스터 (W2 병렬 — 폴더 비중복)
- **C1 핵심일상**: home(2)·attendance(4) — 홈/대시보드·출퇴근·달력·누락·정정.
- **C2 돈**: salary(5)·subscription(2) — 급여리스트/상세/정산/아카이브·구독/결제.
- **C3 매장·운영**: store(7)·workplace(2)·settings(2)·timeoff(1) — 매장상세/편집/운영시간/직원/시급/설정.
- **C4 진입·계정·정보**: welcome(5)·auth(7)·myPage(6)·info(5)·qna/notification/referral(3) — 온보딩·로그인·동의·마이페이지·인포허브.
- **C5 시스템**: system(8) — 에러/스플래시/권한 등(필요한 것만).

## F. 안 함 (Non-Goal/법): POS·매출분석·재고·채용·다국어·주민번호 저장·세무/노무 대행·4대보험 EDI.
