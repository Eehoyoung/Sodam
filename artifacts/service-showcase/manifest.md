# 소담 서비스 시연 캡처 매니페스트

## 초기 수집 목록(재수집 대상)

초기 수집본은 PowerShell 표준 출력 리디렉션으로 PNG 바이트가 변환된 사실을 확인했다. 아래 목록은 화면 전환 이력 참고용이며, 소개 HTML에는 사용하지 않는다. 실제 소개에 사용하는 파일은 다음 `PNG 무결성 검증 완료 캡처` 목록으로 한정한다.

| 파일 | 역할 | 기능 | 검증 상태 |
|---|---|---|---|
| `07-master-debug-host.png` | 공통 | 시작 화면 | 실제 렌더링 |
| `08-employee-debug-host.png` | 공통 | 시작 화면 | 실제 렌더링 |
| `09-master-role-select.png` | 사장 | 역할 선택·가입 | 실제 렌더링 |
| `10-employee-role-select.png` | 직원 | 역할 선택·가입 | 실제 렌더링 |
| `17-master-email-check.png` | 사장 | 이메일 중복 확인·약관 | 실제 렌더링 |
| `18-master-consents.png` | 사장 | 필수 약관 동의 | 실제 렌더링 |
| `20-master-login.png` | 사장 | 로그인 | 실제 렌더링 |
| `21-employee-login.png` | 직원 | 로그인 | 실제 렌더링 |
| `22-master-login-result.png` | 사장 | 가입 후 프로필 보강 | 실제 렌더링 |
| `23-employee-login-result.png` | 직원 | 가입 후 프로필 보강 | 실제 렌더링 |
| `24-master-post-profile.png` | 사장 | 신규 사장 대시보드 | 실제 API 연동 |
| `25-master-store-register.png` | 사장 | 매장 등록 1단계 | 실제 렌더링 |
| `26-master-store-dashboard.png` | 사장 | 매장·직원·오늘 근태 현황 | 실제 API 연동 |
| `29-master-employee-management.png` | 사장 | 매장 운영 메뉴 | 실제 API 연동 |
| `30-master-schedule.png` | 사장 | 출퇴근 이상 목록 | 실제 API 연동 |
| `31-master-attendance-manual-record.png` | 사장 | 위치 권한 요청 | 실제 OS 권한 흐름 |
| `36-master-schedule-board.png` | 사장 | 스케줄 캘린더 | 실제 API 연동 |
| `37-master-schedule-dnd-board.png` | 사장 | 주간 스케줄 보드 | 실제 렌더링 |
| `38-master-schedule-template.png` | 사장 | 스케줄 템플릿 | 실제 렌더링 |
| `41-master-payroll-list.png` | 사장 | 급여 정산 기간 설정 | 실제 API 연동 |
| `42-master-payroll-preview.png` | 사장 | 급여 정산 사전 검증 | 정산 주기 미설정으로 1단계 유지 |
| `44-employee-login-final.png` | 직원 | 오늘의 근무·예상 급여 홈 | 실제 API 연동 |
| `47-employee-schedule.png` | 직원 | 내 월간 근무 일정 | 실제 API 연동 |
| `48-employee-payroll.png` | 직원 | 지난 급여명세 보관함 | 실제 API 연동 |
| `49-employee-contract.png` | 직원 | 내 근로계약서 수신함 | 실제 API 연동 |
| `50-employee-notifications.png` | 직원 | 알림 분류와 수신함 | 실제 API 연동 |
| `51-employee-attendance-attempt.png` | 직원 | 출퇴근 인증 방식 선택 | 실제 API 연동 |
| `55-employee-location-checkin-success.png` | 직원 | 위치 기반 출근 요청 | 백엔드 출근 등록·알림 발행 성공, 화면 갱신 상태는 별도 확인 필요 |
| `57-master-after-employee-checkin.png` | 사장 | 직원 출근 반영 대시보드 | 실제 API 연동: 오늘 출근·근무중 1명 |
| `58-master-checkin-notification.png` | 사장 | 직원 출근 알림 | 실제 API 연동: 출근 등록 이벤트 표시 |

## PNG 무결성 검증 완료 캡처

Android 기기 내부 `screencap` 파일을 `adb pull`로 복사하고 PNG 시그니처를 검증한 화면이다.

| 파일 | 역할 | 기능 | 검증 상태 |
|---|---|---|---|
| `08-employee-debug-host.png` | 공통 | 시작 화면 | 실제 렌더링·PNG 검증 |
| `10-employee-role-select.png` | 직원 | 역할 선택·회원가입 | 실제 렌더링·PNG 검증 |
| `21-employee-login.png` | 직원 | 로그인 | 실제 렌더링·PNG 검증 |
| `29-master-employee-management.png` | 사장 | 매장 운영 메뉴 | 실제 API 연동·PNG 검증 |
| `36-master-schedule-board.png` | 사장 | 스케줄 캘린더 | 실제 API 연동·PNG 검증 |
| `37-master-schedule-dnd-board.png` | 사장 | 주간 스케줄 보드 | 실제 렌더링·PNG 검증 |
| `38-master-schedule-template.png` | 사장 | 스케줄 템플릿 | 실제 렌더링·PNG 검증 |
| `41-master-payroll-list.png` | 사장 | 급여 정산 기간 설정 | 실제 API 연동·PNG 검증 |
| `44-employee-login-final.png` | 직원 | 오늘의 근무·예상 급여 홈 | 실제 API 연동·PNG 검증 |
| `51-employee-attendance-attempt.png` | 직원 | 출퇴근 인증 방식 선택 | 실제 API 연동·PNG 검증 |
| `57-master-after-employee-checkin.png` | 사장 | 직원 출근 반영 대시보드 | 실제 API 연동·PNG 검증 |
| `58-master-checkin-notification.png` | 사장 | 직원 출근 알림 | 실제 API 연동·PNG 검증 |
| `59-master-wage-policy.png` | 사장 | 매장 기본 시급 정책 | 실제 API 연동·PNG 검증 |
| `60-master-business-hours.png` | 사장 | 요일별 운영시간 설정 | 실제 API 연동·PNG 검증 |
| `61-master-store-notice.png` | 사장 | 매장 공지 | 실제 API 연동·PNG 검증 |
| `62-master-notice-editor.png` | 사장 | 매장 공지 작성 | 실제 렌더링·PNG 검증 |
| `63-master-notice-editor-filled.png` | 사장 | 공지 작성 입력 상태 | 실제 렌더링·PNG 검증 |
| `64-master-store-operations-more.png` | 사장 | 매입·급여 미리보기·세무 운영 메뉴 | 실제 API 연동·PNG 검증 |
| `65-master-weekly-insights.png` | 사장 | 최근 7일 매장 인사이트 | 실제 API 연동·PNG 검증 |
| `66-master-tax-documents.png` | 사장 | 매장 운영 상단 화면 재검증 | 실제 API 연동·PNG 검증 |
| `67-master-tax-documents.png` | 사장 | 플랜 기능 잠금 안내 | 실제 렌더링·PNG 검증 |
| `68-employee-profile-basics.png` | 직원 | 로그인 후 필수 프로필 보강 | 실제 API 연동·PNG 검증 |
| `69-employee-home-runtime.png` | 직원 | 오늘의 근무·예상 급여 홈 | 실제 API 연동·PNG 검증 |
| `70-employee-schedule-runtime.png` | 직원 | 내 월간 근무 일정 | 실제 API 연동·PNG 검증 |
| `71-employee-payroll-runtime.png` | 직원 | 지난 급여명세 보관함 | 실제 API 연동·PNG 검증 |
| `72-employee-contract-runtime.png` | 직원 | 내 근로계약서 수신함 | 실제 API 연동·PNG 검증 |
| `73-employee-notifications-runtime.png` | 직원 | 알림 분류와 수신함 | 실제 API 연동·PNG 검증 |
| `74-employee-attendance-runtime.png` | 직원 | 위치 권한 요청 | 실제 OS 권한 흐름·PNG 검증 |
| `75-employee-attendance-methods.png` | 직원 | 기본·위치·NFC 출근 방식 | 실제 API 연동·PNG 검증 |
| `76-employee-location-checkin-runtime.png` | 직원 | 위치 기반 출근 시도 | 실제 API 연동·PNG 검증 |
| `77-master-employee-list.png` | 사장 | 주간 인사이트의 직원 등록 반영 | 실제 API 연동·PNG 검증 |
| `78-master-employee-list.png` | 사장 | 매장 소속 직원 목록·초대 진입 | 실제 API 연동·PNG 검증 |
| `79-master-employee-detail.png` | 사장 | 직원 노무 정보·시급 상세 | 실제 API 연동·PNG 검증 |
| `80-master-employee-detail-actions.png` | 사장 | 보너스·계약·서류·휴게·연소근로자 작업 | 실제 API 연동·PNG 검증 |
| `81-master-contract-compose.png` | 사장 | 근로계약서 수신 직원 선택 | 실제 렌더링·PNG 검증 |
| `82-master-contract-details.png` | 사장 | 계약 임금형태·5인 기준·근로조건 단계 | 실제 렌더링·PNG 검증 |

## PRD 도메인 커버리지 감사

각 행은 PRD의 구현 완료 도메인에 대해 서로 다른 실제 화면을 2장 이상 연결한다. `recruitment`는 PRD에서 Phase 1 스키마 상태로 표시되어 서비스 소개 대상에서 제외한다.

| PRD 도메인 | 실제 화면 근거 (2장 이상) | 시연 판정 |
|---|---|---|
| 인증·온보딩 | `08`, `10`, `21`, `68` | 역할 선택·로그인·프로필 보강 확인 |
| 매장 | `29`, `59`, `60`, `61` | 매장 설정·시급·운영시간·공지 확인 |
| 직원 관리·계약 | `78`, `79`, `80`, `81`, `82` | 직원 상세와 계약 작성 흐름 확인 |
| 출퇴근 | `57`, `58`, `74`, `75`, `76` | 권한·인증방식·사장 현황/알림 확인 |
| 스케줄 | `36`, `37`, `38`, `70` | 캘린더·주간 보드·템플릿·직원 열람 확인 |
| 급여 | `41`, `64`, `71` | 정산 시작·급여 미리보기 진입·직원 명세 보관함 확인 |
| 노무 안전장치 | `65`, `67`, `80` | 인사이트·플랜 게이트·연소근로자/휴게 작업 진입 확인 |
| 수익화·구독 | `64`, `67` | 기능 목록과 플랜 잠금 안내 확인 |
| 알림·실시간 | `58`, `61`, `63`, `73` | 출근 이벤트·공지 작성·직원 알림함 확인 |
| 부가 운영 | `64`, `65`, `66` | 매입·세무·인사이트 화면 확인 |

## 결함 증빙

| 파일 | 재현 내용 | 상태 |
|---|---|---|
| `32-master-attendance-record-form.png` | 사장 수동 기록 진입 후 직원 전용 근무지 조회가 404 | 수정 검토 중 |
| `53-employee-location-checkin-submit.png` | 위치 동의 전 GPS 출근을 요청하면 API 400과 개발 콘솔 오류가 노출됨 | 위치 동의 후 재시도 시 백엔드 등록 성공. 오류 UI 개선 검토 필요 |
| `56-employee-home-after-checkin.png` | 출근 등록 성공 후 직원 근태 화면이 당일 기록을 즉시 갱신하지 않음 | 사장 대시보드와 알림에는 즉시 반영됨. 날짜/상태 동기화 검토 필요 |
| `81-master-contract-compose.png` | 계약서 발송 진입 시 `ManagerAppointSection` 렌더 중 `GlobalOfflineBanner` 상태 갱신 React 경고가 개발 오버레이에 노출됨 | 소스 원인 분석 및 수정 검토 필요 |

나머지 PNG는 Metro 연결 및 화면 전환 진단 과정에서 생성된 원본 증빙이다. 소개 HTML에는 유효 캡처만 사용한다.
