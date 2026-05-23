# DOCKER.md — Docker 기반 풀스택 실행 가이드

> 8080/8081/3306 다른 프로젝트가 점유 중이어도 충돌 없이 띄울 수 있도록 호스트 포트를 안전 범위(7070 / 13306 / 16379 / 18080)로 매핑.

## 0. 필요한 것
- Docker Desktop 4.30+ (Windows / Mac / Linux)
- Compose v2 (`docker compose` 명령)
- 메모리 4GB+ 할당 권장

## 1. 첫 실행 (3 단계)

```powershell
# 1) 환경변수 템플릿 복사
cp .env.example .env
# 또는 PowerShell:
Copy-Item .env.example .env

# 2) .env 의 비밀번호·시크릿을 본인 값으로 변경
# 최소 변경 항목:
#   SODAM_DB_ROOT_PASSWORD
#   SODAM_DB_PASSWORD
#   SODAM_JWT_SECRET (openssl rand -base64 48 로 생성 권장)

# 3) 전체 기동
docker compose up -d --build

# 4) BE 로그 추적 (Started SodamApplication 메시지 확인)
docker compose logs -f sodam-be
```

## 2. 포트 매핑 (호스트 → 컨테이너)
| 서비스 | 호스트 | 컨테이너 | 용도 |
|---|---|---|---|
| sodam-be | **7070** | 8080 | Spring Boot |
| sodam-mysql | **13306** | 3306 | MySQL 8.0 |
| sodam-redis | **16379** | 6379 | Redis 7 |
| sodam-adminer | **18080** | 8080 | DB GUI |

`.env` 의 `SODAM_BE_PORT` 등으로 호스트 포트 변경 가능.

## 3. 헬스 체크 + 접속 확인

```powershell
# BE 헬스
curl http://localhost:7070/actuator/health
# 응답: {"status":"UP",...}

# 플랜 카탈로그 (비인증)
curl http://localhost:7070/api/billing/plans

# Swagger UI
start http://localhost:7070/swagger-ui/index.html

# DB GUI (Adminer)
# 브라우저: http://localhost:18080
# Server: sodam-mysql / User: sodam / Pass: .env 의 SODAM_DB_PASSWORD / DB: sodam
```

## 4. 자주 쓰는 명령어

```powershell
# 컨테이너 상태 확인
docker compose ps

# BE 만 재시작
docker compose restart sodam-be

# BE 코드 변경 후 재빌드
docker compose up -d --build sodam-be

# 로그 추적 (실시간)
docker compose logs -f sodam-be
docker compose logs -f sodam-mysql

# 컨테이너 내부 셸 진입
docker compose exec sodam-be sh
docker compose exec sodam-mysql mysql -u sodam -p sodam

# 정지 (볼륨 유지)
docker compose down

# 정지 + 볼륨 삭제 (DB 초기화)
docker compose down -v
```

## 5. FE 연동 (개발용)

FE 는 `src/common/config/env.ts` 의 분기로 자동 연결:

| 환경 | 호스트 | BE URL |
|---|---|---|
| Android 에뮬레이터 | 호스트 PC | `http://10.0.2.2:7070` |
| iOS 시뮬레이터 | 호스트 PC | `http://localhost:7070` |
| 실 디바이스 | LAN | `http://<PC LAN IP>:7070` (`.env` 의 `SODAM_API_BASE_URL` 로 override) |

> 호스트 PC 의 방화벽이 7070 인바운드를 막고 있으면 실기기에서 접속 불가. Windows Defender 인바운드 규칙 추가 필요.

## 6. 외부 통합 모드 전환

`.env` 에서 mode 플래그만 바꾸면 됨:

```bash
# 토스 결제 실 연동
SODAM_TOSS_MODE=live
TOSS_CLIENT_KEY=test_ck_...  # 토스 콘솔에서 발급
TOSS_SECRET_KEY=test_sk_...
TOSS_WEBHOOK_SECRET=...

# FCM 푸시 실 연동
SODAM_FCM_MODE=live
FCM_PROJECT_ID=sodam-prod
# google-service-account.json 을 volume 으로 마운트
# docker-compose.yml 에 추가:
#   volumes:
#     - ./secrets/fcm-service-account.json:/app/secrets/fcm-service-account.json:ro

# Sentry 에러 추적
SODAM_SENTRY_MODE=live
SENTRY_DSN=https://...@sentry.io/...

# 카카오 OAuth 실 연동
SODAM_KAKAO_MODE=live
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
```

`docker compose restart sodam-be` 한 번이면 적용.

## 7. 운영 환경 점검표

운영 배포 전 체크:
- [ ] `.env` 의 모든 `change-me-*` 값 회전
- [ ] `SODAM_JWT_SECRET` 32바이트+ 랜덤 (`openssl rand -base64 48`)
- [ ] `SODAM_DB_PASSWORD` 16자+ 복잡도
- [ ] `SODAM_TOSS_MODE=live` + 실 키
- [ ] `SODAM_FCM_MODE=live` + 서비스 계정 JSON 마운트
- [ ] `SODAM_SENTRY_MODE=live` + DSN
- [ ] MySQL 백업 cron (S3 cross-region)
- [ ] HTTPS 리버스 프록시 (Caddy / Nginx) 앞단 배치
- [ ] 도메인 + Let's Encrypt
- [ ] 로그 회전 (logrotate 또는 docker logging driver)

## 8. 트러블슈팅

### "Bind for 0.0.0.0:7070 failed: port is already allocated"
호스트 포트 충돌. `.env` 에서 `SODAM_BE_PORT` 를 다른 값(예: 17070)으로 변경.

### "Connection refused: sodam-mysql:3306"
MySQL 부팅 미완. `docker compose ps` 로 `sodam-mysql` 의 상태 확인. `healthy` 가 될 때까지 BE 가 자동 재시도하나, 30초+ 걸릴 수 있음.

### BE 로그에 한글 깨짐 (`���`)
컨테이너의 TZ + LANG 환경. 이미 Dockerfile 에 `TZ=Asia/Seoul` 설정. 로컬 터미널의 codepage 가 949 인 경우 발생 — `chcp 65001` (Windows PowerShell) 또는 `LANG=ko_KR.UTF-8` (WSL/Linux) 로 변경.

### "out of memory" 또는 OOMKilled
JVM 메모리 제한 — Docker Desktop 메모리 6GB+ 할당. `JAVA_OPTS` 에서 `-XX:MaxRAMPercentage=75` 가 컨테이너 메모리의 75% 까지 사용.

### MySQL 데이터 영구화 확인
```powershell
docker volume ls | grep sodam_mysql_data
docker volume inspect sodam_mysql_data
```

## 9. 운영 vs 개발 프로필 차이

| 항목 | dev (H2) | prod (Docker MySQL) |
|---|---|---|
| DB | H2 in-memory | MySQL 8.0 영구 볼륨 |
| Redis | 옵셔널 (없으면 ConcurrentMap) | 실 Redis |
| 토큰 저장 | InMemoryTokenStore | RedisService |
| 외부 통합 | 모두 mock | mode 따라 |
| `DevSeedRunner` | 자동 실행 | 비활성 (`@Profile("dev")`) |

## 10. 다음 단계

- 운영 도메인 + HTTPS → `docs/legal/` 의 약관 검토 후
- CI/CD GitHub Actions (Docker image push to GHCR)
- AWS ECS Fargate 또는 단일 EC2 + Compose
- 백업 자동화 (S3 + lifecycle)
