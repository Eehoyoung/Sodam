# 🛑 CONFIRM_REQUIRED.md — 사용자 컨펌 필요 항목

> 이 파일은 **Claude가 자율 진행할 수 없는 작업** 모음이다.
> 사용자(1인 사업가)가 직접 결정·실행해야 한다.
> 각 항목 옆 `[ ]` 가 `[x]` 로 바뀌면 Claude가 후속 자율 작업을 이어간다.

**생성일**: 2026-05-19
**상태**: 초기 — 출시(M3, 2026-08-31)까지 모두 ✅ 되어야 함

---

## 🔴 P0 — 외부 서비스 가맹/계정 (출시 차단)

### C-1. 토스페이먼츠 정기결제 가맹 신청
- [ ] 사업자등록증 발급 (간이과세자로 시작)
- [ ] 통신판매업 신고 (구청, 약 ₩45,000)
- [ ] 토스페이먼츠 가맹 신청 → 정기결제 사용 신청
- [ ] 테스트 API 키 발급 (`TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`)
- [ ] 운영 API 키 발급 (가맹 승인 후)

**Claude가 대기 중인 후속 작업**: 빌링키 발급/정기결제/웹훅 처리 코드는 스켈레톤 완성 → 실제 키 받으면 즉시 결제 테스트 가능

---

### C-2. FCM (Firebase Cloud Messaging)
- [ ] Firebase 프로젝트 생성 (`sodam-prod`, `sodam-dev`)
- [ ] Android 앱 등록 (패키지명: `com.sodam.app`)
- [ ] `google-services.json` 다운로드 → `frontend/android/app/`
- [ ] FCM 서버 키 발급 → `.env`의 `FCM_SERVER_KEY`에 저장

**Claude가 대기 중인 후속 작업**: 토큰 등록 API + 알림 발송 서비스는 완성 → 키 받으면 즉시 푸시 가능

---

### C-3. Sentry
- [ ] sentry.io 계정 생성 (무료 플랜)
- [ ] 프로젝트 2개 생성 (`sodam-backend` Java, `sodam-frontend` React Native)
- [ ] DSN 2개 발급 → `.env`의 `SENTRY_DSN_BE`, `SENTRY_DSN_FE`
- [ ] 알람 채널 연동 (Slack or 텔레그램 봇)

---

### C-3-1. 이메일 발송 (트랜잭셔널 메일) — 비밀번호 재설정·환영 메일에 필요
- [ ] AWS SES (한국 리전) 또는 SendGrid 가입
- [ ] 도메인 인증 (DKIM/SPF/DMARC)
- [ ] 발신 메일 주소 결정 (예: `no-reply@sodam.app`)
- [ ] API 키 발급 → `.env` 의 `EMAIL_SENDER_*` 키
- [ ] (Phase 2) 이메일 템플릿 (환영/명세서 발급/구독 결제 알림)

**Claude 대기 후속 작업**: `EmailSender` 인터페이스 분리 + `LiveEmailSender` 구현체 추가. 현재는 mock(로그) 만 동작.

---

### C-4. 채널톡 (CS 위젯)
- [ ] channel.io 가입 (무료 플랜)
- [ ] 플러그인 키 발급 → `CHANNEL_TALK_PLUGIN_KEY`
- [ ] 챗봇 시나리오 5종 초안 작성 (가입/결제/출퇴근/급여/탈퇴)

---

### C-5. Play Store 개발자 계정
- [ ] Google Play Console 개발자 등록 ($25, 1회)
- [ ] 앱 등록 (패키지명, 앱 이름, 카테고리)
- [ ] 스크린샷 8장 준비 (16:9 비율)
- [ ] 앱 설명 작성 (단·장 버전)
- [ ] 개인정보 안전 섹션 작성
- [ ] 콘텐츠 등급 설문 응답

---

### C-6. AWS 계정 및 인프라
- [ ] AWS 루트 계정 생성 (개인 사업자 계정)
- [ ] 결제 알림 (월 ₩200K 초과 시) 설정
- [ ] IAM 사용자 분리 (root 직접 사용 금지)
- [ ] AWS Secrets Manager에 시크릿 이관:
  - `JWT_SECRET`
  - `DB_PASSWORD`
  - `KAKAO_CLIENT_SECRET`
  - `TOSS_SECRET_KEY`
  - `FCM_SERVER_KEY`
  - `SENTRY_DSN_*`

**현재 `.env` 노출 시크릿** (즉시 회전 권장):
- `DB_PASSWORD=Cv93523827!!` → 새 비밀번호로 회전 (개발 DB라도 회전)
- `KAKAO_CLIENT_SECRET=2d79ffccdd762489eb43c16413922309` → Kakao Developers에서 재발급
- `JWT_SECRET=...` → 32바이트 랜덤 문자열로 재생성

---

### C-7. 카카오 OAuth (재발급 필요)
- [ ] Kakao Developers 콘솔 접속
- [ ] 기존 앱(`28f9c414aad345b18a52dc62a3373603`) 시크릿 **재발급** (현재 .env에 노출됨)
- [ ] Redirect URI 운영 도메인 추가

---

## 🟠 P1 — 법무·정책 (출시 차단)

### C-8. 법무 검토
- [ ] 변호사 자문 1회 (예산 ~₩500K)
- [ ] 개인정보 처리방침 검토 (Claude 초안 → `docs/legal/privacy-policy.md`)
- [ ] 이용약관 검토 (Claude 초안 → `docs/legal/terms-of-service.md`)
- [ ] 마케팅 정보 수신 동의 양식 검토
- [ ] 환급형 플랜 약관(세무사 대행) 검토 — Phase 2

### C-9. 사업자 신고
- [ ] 세무서 사업자등록 (업태: 정보통신업, 종목: 소프트웨어 개발 공급업)
- [ ] 사업용 계좌 1개 개설
- [ ] 사업용 카드 1개 발급
- [ ] 통신판매업 신고
- [ ] 부가가치세 일반/간이 결정 (매출 ₩8천만 미만이면 간이)

---

## 🟡 P2 — 운영/마케팅 (출시 후 30일 이내)

### C-10. 도메인·SSL
- [ ] 도메인 구매: `sodam.app` 또는 `sodam.kr` (가비아/카페24)
- [ ] DNS Route53 설정
- [ ] SSL 인증서 (AWS Certificate Manager 무료)

### C-11. 마케팅 채널
- [ ] 인스타그램 비즈니스 계정 생성
- [ ] 당근 비즈니스 계정 생성
- [ ] 메타 광고 매니저 결제 수단 등록
- [ ] 베타 사장님 10명 사전 컨택 (소상공인 카페, 동네 글)

### C-12. 분석 도구
- [ ] Amplitude 가입 (무료 플랜 10K MAU)
- [ ] 자체 이벤트 테이블 vs Amplitude 선택

### C-13. 백오피스(콘텐츠 관리)
- [ ] 노무/세무/정책 콘텐츠 작성자 결정 (외주 vs 본인)
- [ ] 초기 콘텐츠 30건 작성 의뢰 또는 자체 작성

---

## 🟢 P3 — Phase 2 이후 (M6+)

### C-14. 세무사 파트너십
- [ ] 1인 세무사 5곳 미팅
- [ ] 수수료 분배 계약서 (Claude가 초안 작성 가능)
- [ ] 환급 가능 케이스 시뮬레이션 검토

### C-15. iOS 출시 준비
- [ ] Apple Developer 계정 ($99/년)
- [ ] iOS 앱 등록
- [ ] TestFlight 베타 테스터 모집

---

## 📝 컨펌 후 Claude 후속 작업 매핑

| 컨펌 완료 시 | Claude가 즉시 진행할 작업 |
|---|---|
| C-1 (토스 API 키) | 결제 통합 테스트, 정기결제 플로우 E2E |
| C-2 (FCM 키) | Android 빌드에 키 주입, 4종 알림 실 발송 테스트 |
| C-3 (Sentry DSN) | 에러 추적 활성화, 알람 룰 설정 |
| C-4 (채널톡 키) | FE 위젯 통합, 챗봇 시나리오 5종 작성 |
| C-5 (Play Console) | AAB 빌드 자동화, 베타 트랙 업로드 스크립트 |
| C-6 (AWS) | Terraform/CDK 인프라 코드, GitHub Actions 배포 파이프라인 |
| C-8 (법무 검토 완료) | FE 동의 화면 정식 텍스트 반영, 백오피스 약관 페이지 |
| C-10 (도메인) | 운영 환경 application-prod.yml, CORS·HTTPS 설정 |

---

**규칙**:
- 사용자는 위 항목 중 완료한 것을 `[ ]` → `[x]` 로 직접 갱신
- 갱신 후 Claude에게 "C-X 완료, 후속 작업 진행해줘" 라고 알리면 즉시 다음 단계 진행
- Claude는 컨펌 없이 위 항목을 임의로 ✅ 처리하지 않음
