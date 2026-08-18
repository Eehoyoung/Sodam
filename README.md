# 소담(SODAM)

2026년 근로감독 현장 점검은 근로계약서·임금명세서 교부에 집중됩니다. **소담은 둘 다 자동입니다.**
노무 지식이 없어도 근로기준법 위험을 놓치지 않도록, 확정된 스케줄만으로 위반 가능성을 미리 계산해
알려드리는 매장 인력관리 모바일 SaaS입니다 — 사장님은 직원 출퇴근·스케줄·급여를 한 번에 관리하고,
직원은 출퇴근 체크와 급여명세서를 앱에서 바로 확인합니다.

## 주요 기능

- **노무 사전 예측(참고용)**: 확정 스케줄만으로 주 52시간 초과·연소근로자 야간근로 등 위반 가능성을
  실제 근무 전에 미리 알려드려요. 상시근로자 수(근로기준법 시행령 §7의2) 참고 산정도 제공합니다 —
  판정은 참고용이며 최종 판단은 근로감독관·법원의 권한입니다
- **출퇴근**: 위치(GPS)·QR·NFC·사장 승인제 출퇴근, 정정 요청 (NFC는 Android 전용)
- **스케줄**: 근무표 작성·확정, 드래그앤드롭 편집, 주간 템플릿 저장/적용, 대타 모집·지원
- **급여**: 시급·연장/야간/휴일 가산·주휴수당 자동 계산, 정산 마법사, 급여명세서 PDF 발급
- **근로계약**: 전자 근로계약서 작성·서명, 근로기준법 §17 필수 기재사항 반영
- **퇴사 처리**: 사직서 제출·철회, 퇴사일 왕복 협의, 퇴사 확인서 양측 전자서명
- **매입장부**: 영수증 기반 매입 기록·거래처별 비교 (재고 자동차감·원가율·POS 연동은 하지 않습니다)
- **인증채용**: 매장 구인공고와 직원 구직 프로필 매칭
- **구독/결제**: 4단계 플랜(무료~프리미엄), 토스페이먼츠 정기결제 연동
- **AI 보조(선택)**: 정정 사유·지원 메시지 다듬기, 공고 소개문·주간 브리핑 초안 생성.
  `sodam.ai.provider`를 설정해야 켜지며 **기본값은 비활성**입니다 — 미설정 시 외부 호출이 0건이고
  모든 기능이 원본 텍스트로 그대로 동작합니다

## 빠른 시작

```powershell
cp .env.example .env
docker compose up -d --build
curl http://localhost:7070/actuator/health
```

로컬 백엔드 실행:

```powershell
cd backend
.\gradlew bootRun --args='--spring.profiles.active=dev'
```

프론트 실행:

```powershell
cd frontend
npm install
npm run start
npm run android
```

## DB 스키마 관리

`docker compose up`으로 띄우는 로컬 스택은 **Flyway**(`backend/src/main/resources/db/migration/V*.sql`)가
스키마를 관리합니다 — 엔티티를 바꾸면 Hibernate가 알아서 컬럼을 추가해주지 않으니, 반드시 대응하는
`V{n}__설명.sql` 마이그레이션 파일을 같은 커밋에 함께 작성하세요(`.claude/rules/api-design.md` 참조).
부팅 시 `spring.jpa.hibernate.ddl-auto=validate`가 엔티티-스키마 불일치를 즉시 잡아냅니다(운영과 동일
경로).

이미 있는 V파일은 절대 수정하지 마세요(체크섬이 깨져 다른 환경에서 검증 실패) — 스키마를 더 바꿔야 하면
새 V파일을 추가하세요.

로컬 볼륨을 완전히 초기화하고 처음부터 Flyway로 다시 만들고 싶다면:

```powershell
docker compose down -v   # sodam_mysql_data 볼륨 삭제 — 로컬 개발 데이터 전부 사라짐
docker compose up -d --build
```

## 개발 계정

Dev 프로필 실행 시 기본 계정이 자동 생성됩니다.

- 사장님: `owner@sodam.dev` / `sodam1234`
- 직원: `staff@sodam.dev` / `sodam1234`

## 주요 경로

- `backend/`: Spring Boot API 서버 (Java 17, Spring Boot 3.4.5)
- `frontend/`: React Native 앱
- `docker-compose.yml`: 로컬 풀스택 실행 구성
- `.env.example`: 환경변수 예시

## 검증

```powershell
cd backend
.\gradlew test
```

```powershell
cd frontend
npm run test:unit   # npm test 는 실기기가 필요한 logcat 테스트까지 돌립니다
npm run lint
```

CI(`.github/workflows/test.yml`)도 같은 명령(`gradlew test` / `test:unit` + `lint`)을 돌립니다.
