# 소담(SODAM)

소상공인 매장의 근태, 급여, 노무 운영을 돕는 모바일 SaaS입니다.

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

## 개발 계정

Dev 프로필 실행 시 기본 계정이 자동 생성됩니다.

- 사장님: `owner@sodam.dev` / `sodam1234`
- 직원: `staff@sodam.dev` / `sodam1234`

## 주요 경로

- `backend/`: Spring Boot API 서버
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
