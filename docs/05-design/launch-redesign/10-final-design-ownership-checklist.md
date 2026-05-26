# Final Design Ownership Checklist

이 프로젝트의 디자인 최종 책임 범위는 아래 전체다. 하나라도 빠지면 “디자인 완료”가 아니다.

## Screen Coverage

- [x] 실제 FE 화면 파일 전체 커버
- [x] 신규 IA 화면 커버
- [x] 역할별 홈 커버
- [x] 빈 상태 커버
- [x] 오류 상태 커버
- [x] 권한 상태 커버
- [x] 로딩 상태 커버
- [x] 버튼 연결 스토리보드 커버
- [x] 바텀시트/모달/토스트 커버

## Visual System

- [x] 컬러 토큰
- [x] 타이포그래피
- [x] 간격
- [x] Radius
- [x] Shadow
- [x] Header
- [x] Bottom Tab
- [x] Button
- [x] Card
- [x] Badge
- [x] Input
- [x] Toast
- [x] Bottom Sheet
- [x] Modal

## UX System

- [x] 사장님 플로우
- [x] 직원 플로우
- [x] 개인 사용자 플로우
- [x] 매니저 플로우
- [x] 인증 플로우
- [x] 매장 등록 플로우
- [x] 직원 초대 플로우
- [x] 출퇴근 플로우
- [x] 정정 요청 플로우
- [x] 휴가 신청 플로우
- [x] 급여 정산 플로우
- [x] 구독/결제 플로우
- [x] 정보/Q&A 플로우
- [x] 설정/계정 플로우

## Responsive Gate

- [x] 320px 폭 기준
- [x] 360px 폭 기준
- [x] 390px 폭 기준
- [x] 430px 폭 기준
- [x] safe-area 하단 대응
- [x] 하단 탭과 CTA 겹침 방지
- [x] 긴 텍스트 overflow 방지
- [x] 유동 폰 프레임
- [x] 카드/리스트 자동 높이

## Implementation Must Not Invent

구현자가 새로 임의 결정하면 안 되는 항목:

- 버튼 문구
- 빈 상태 문구
- 오류 문구
- 권한 안내 문구
- 배지 색상/문구
- 탭 이름
- 헤더 액션 위치
- CTA 우선순위
- 급여 breakdown 표시 순서
- 출퇴근 성공/실패 흐름
- 매장 등록 단계 수
- 직원 초대 코드 표현
- 탈퇴/삭제 확인 단계

## Remaining Design Review Rule

새 화면이나 새 기능이 추가되면 아래 순서로 검토한다.

1. 기존 51개 목업 중 어떤 패턴을 재사용하는지 확인한다.
2. 해당 기능의 Empty/Error/Loading/Permission 상태를 추가한다.
3. 버튼 연결을 `interaction-map.csv`에 추가한다.
4. 카피를 `09-copy-and-state-library.md`에 추가한다.
5. 320px 폭에서 깨지지 않는지 확인한다.

## Final Authority

이 리디자인의 최종 기준은 다음 순서로 적용한다.

1. `prototypes/sodam-final-all-screens.html`
2. `07-interaction-storyboards.md`
3. `08-micro-design-final-spec.md`
4. `09-copy-and-state-library.md`
5. `05-design-system.md`
6. `06-responsive-accessibility-qa.md`
