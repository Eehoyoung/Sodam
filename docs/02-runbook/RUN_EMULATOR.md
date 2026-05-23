# RUN_EMULATOR.md — 에뮬레이터에서 소담 BE+FE 한 번에 띄우기

> 이 문서대로 따라하면 **API 키 없이도** 소담 백엔드+안드로이드 앱이 에뮬레이터에서 즉시 동작한다.
> 외부 의존성(MySQL/Redis/Toss/FCM/Sentry/Kakao) 은 모두 dev 프로필에서 mock 으로 대체된다.

---

## 0. 필요한 것

| 항목 | 권장 버전 | 비고 |
|---|---|---|
| Java | 17+ | `java -version` 으로 확인 |
| Node.js | 18+ | `node -v` |
| Android Studio | Hedgehog 이상 | 에뮬레이터·SDK 포함 |
| Android SDK | 33+ | Build Tools 33.0.0+ |
| 메모리 | 8GB 이상 권장 | 에뮬레이터+Metro+Gradle 동시 실행 |

> macOS 의 iOS 시뮬레이터도 작동하지만, 이 문서는 **Windows + Android 에뮬레이터** 기준으로 작성.

---

## 1. 한 번만 — 처음 환경 설정

```powershell
# 1) 백엔드 의존성 확인
cd C:\Users\LeeHoYoung\Downloads\Project_backend\sodam
.\gradlew --version

# 2) 프론트엔드 의존성 설치
cd ..\frontend
npm install
```

---

## 2. 백엔드 실행 (포트 **7070** — 8080 충돌 회피)

```powershell
cd C:\Users\LeeHoYoung\Downloads\Project_backend\sodam
.\gradlew bootRun --args='--spring.profiles.active=dev'
```

> 💡 dev 프로필 = **7070** 포트. 운영(prod)은 8080. `application-dev.yml` 의 `server.port` 참조.
> 다른 프로젝트(Docker 등)가 8080/8081 점유 중이어도 충돌 없음.

성공 시 로그:
```
Tomcat started on port 7070 (http)
DevInfraConfig: ConcurrentMapCacheManager 등록 (Redis 없이 인메모리 캐시)
InMemoryTokenStore active — dev profile only.
DevSeed: 데모 데이터 생성 시작
DevSeed: 완료 — owner=owner@sodam.dev / staff=staff@sodam.dev (비번 모두 sodam1234)
Started SodamApplication in N.NNN seconds
```

확인:
- Swagger: http://localhost:7070/swagger-ui/index.html
- H2 Console: http://localhost:7070/h2-console
  - JDBC URL: `jdbc:h2:mem:sodam;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER`
  - User: `sa`, Password: (빈 값)

**테스트 계정** (DevSeedRunner 가 자동 생성):
- 사장님: `owner@sodam.dev` / `sodam1234`
- 직원:   `staff@sodam.dev` / `sodam1234`
- 매장:   "소담 데모 카페" (서울 중구 좌표, 반경 500m)

---

## 3. 안드로이드 에뮬레이터 띄우기

### 3-1. AVD 생성 (한 번만)
Android Studio → Tools → Device Manager → Create Device:
- Phone: Pixel 6 (또는 Pixel 5)
- System Image: API 34 (Android 14) Google APIs
- Configuration: 기본
- **중요**: AVD 설정에서 "Internet" 활성 + RAM 4GB+

### 3-2. 에뮬레이터 시작
```powershell
# Android Studio Device Manager 의 ▶ 버튼 또는:
# %ANDROID_HOME%\emulator\emulator.exe -avd <avd_이름>
```

에뮬레이터 부팅 후 다음 명령으로 BE 연결 확인:
```powershell
adb shell
# (에뮬레이터 안에서)
ping 10.0.2.2     # 호스트 PC 의 localhost = 10.0.2.2 — 응답 와야 함
```

---

## 4. 프론트엔드 실행 (Metro + 앱 빌드)

**터미널 A — Metro 번들러**:
```powershell
cd C:\Users\LeeHoYoung\Downloads\Project_backend\frontend
npm run start
```

**터미널 B — Android 빌드/설치**:
```powershell
cd C:\Users\LeeHoYoung\Downloads\Project_backend\frontend
npm run android
```

빌드는 처음 2~5분 소요. 성공 시 에뮬레이터에 "Sodam" 앱이 자동 실행됨.

---

## 5. 로그인 → 출퇴근 → 급여 → 구독 검증

### 5-1. 사장님 시나리오
1. 앱 첫 화면: 로그인
2. `owner@sodam.dev` / `sodam1234` 로 로그인
3. 홈 → 직원 1명 (지훈) 카드 확인
4. 출퇴근 보드 → 직원 상태 확인
5. 매장 정보 → 위치/반경 확인 (서울 중구)
6. 구독 → 무료 플랜(이용 중) 확인

### 5-2. 직원 시나리오
1. 로그아웃 → `staff@sodam.dev` / `sodam1234`
2. 출퇴근 홈에서 큰 "출근하기" 버튼 표시
3. NFC 미지원 에뮬레이터는 GPS 모드 자동 폴백
4. GPS 출근 → 매장 반경 안에 있다고 가정 (mock 좌표) → 출근 완료

### 5-3. 결제 시나리오 (mock 모드)
1. 사장님으로 로그인
2. 더보기 → 구독 → "비즈니스" 선택
3. "결제 진행하기" → **Mock 모드에서는 토스 SDK 호출이 막혀 있으므로** 임시로 다음 API 직접 호출 가능:

```powershell
# 백엔드에 직접 호출 (mock 빌링키)
$token = "<로그인 응답에서 받은 accessToken>"
curl -X POST http://localhost:7070/api/billing/subscribe `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"plan":"BUSINESS","authKey":"MOCK_AUTH_KEY_001"}'
```

응답 예:
```json
{
  "id": 2,
  "plan": "BUSINESS",
  "status": "ACTIVE",
  "cardLabel": "테스트카드 1234******5678",
  "currentPeriodEndAt": "2026-06-19T...",
  "nextBillingAt": "2026-06-19T..."
}
```

---

## 6. 푸시 알림 (FCM) — mock 모드에서

FCM mock 모드는 실제 푸시는 안 가지만 **BE 로그에 발송 시뮬레이션이 기록**된다.

발송 트리거 (BE 로그 확인):
```
[MOCK FCM] → token=eFGH... title="출근 등록" body="지훈(데모) 님이 소담 데모 카페에 출근했어요." link=sodam://attendance
```

실제 토큰 등록은 FE 에서:
```typescript
import notificationApi from '@/common/services/NotificationService';
await notificationApi.register('test-fcm-token', 'ANDROID');
```

---

## 7. 자주 발생하는 이슈

### 7-1. "Network request failed" 에러
- 원인: 에뮬레이터에서 `localhost`(127.0.0.1) 으로 API 호출 → 에뮬레이터 자체의 localhost 가 잡혀버림
- 해결: `src/common/config/env.ts` 에서 `Platform.OS === 'android'` 일 때 `10.0.2.2` 자동 사용 — 이미 적용됨
- 그래도 안 되면: 백엔드가 `0.0.0.0` 으로 바인딩 됐는지 확인

### 7-2. H2 콘솔에서 테이블이 안 보임
- 한 번 `select * from "user"` 처럼 큰따옴표 사용 (예약어 우회)

### 7-3. Metro 캐시 문제
```powershell
npm run metro-reset
```

### 7-4. Gradle 빌드 실패 (BE)
```powershell
cd backend
.\gradlew clean build -x test
```

### 7-5. Android 빌드 실패 (FE)
```powershell
cd frontend
npm run gradle-clean
npm run android
```

---

## 8. 운영 환경으로 전환할 때

1. `backend/src/main/resources/application-prod.yml.example` 복사 → `application-prod.yml`
2. AWS Secrets Manager 또는 환경변수로 모든 시크릿 주입
3. `sodam.integration.*.mode` 를 모두 `live` 로
4. FE: `SODAM_API_BASE_URL=https://sodam-api.com npm run build:android:release`
5. **CONFIRM_REQUIRED.md** 의 모든 P0 항목 ✅ 확인 후 출시

---

## 9. 디버깅 팁

| 도구 | 용도 |
|---|---|
| `npm run android` | 실시간 로그 + Hot Reload |
| Android Studio Logcat | 네이티브 로그 (NFC/GPS 권한 디버깅) |
| `adb logcat *:E ReactNative:V ReactNativeJS:V` | RN JS 로그만 필터 |
| Charles Proxy or mitmproxy | API 트래픽 가로채기 (인증서 설치 필요) |
| Spring Boot DevTools | 코드 수정 시 BE 자동 재시작 |
| Swagger UI | API 호출 테스트 (Authorize 버튼에 `Bearer <token>`) |
