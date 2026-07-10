# 소담(SODAM)

소상공인 매장의 근태·급여·노무 운영을 돕는 모바일 SaaS입니다. 사장님은 직원 출퇴근·스케줄·급여를
한 번에 관리하고, 직원은 출퇴근 체크와 급여명세서를 앱에서 바로 확인합니다.

## 주요 기능

- **출퇴근**: 위치 기반 출근·퇴근, 사장 승인제 출퇴근, 정정 요청
- **스케줄**: 근무표 작성·확정, 드래그앤드롭 편집, 주간 템플릿 저장/적용
- **급여**: 시급·연장/야간/휴일 가산·주휴수당 자동 계산, 정산 마법사, 급여명세서 PDF 발급
- **근로계약**: 전자 근로계약서 작성·서명, 근로기준법 §17 필수 기재사항 반영
- **구독/결제**: 4단계 플랜(무료~프리미엄), 토스페이먼츠 정기결제 연동

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
npm test
```
