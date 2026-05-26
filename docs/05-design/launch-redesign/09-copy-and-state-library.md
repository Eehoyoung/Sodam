# Copy and State Library

소담의 문구는 쉽고 친숙하지만 가볍지 않아야 한다.  
사용자에게 “잘하고 있어요”보다 “지금 무엇을 하면 되는지”를 알려준다.

## Voice

- 존댓말 사용.
- 사장님/직원/개인 사용자별 표현을 다르게 쓴다.
- SaaS식 추상어 금지: 혁신, 스마트, 워크플로우, 최적화.
- 실제 업무어 사용: 출근, 퇴근, 시급, 주휴수당, 명세서, 정산.

## Primary CTA Copy

| Context | CTA |
|---|---|
| Role owner | 사장님으로 시작하기 |
| Role employee | 직원으로 시작하기 |
| Role personal | 개인 기록 시작하기 |
| Login | 로그인 |
| Signup step | 다음 |
| Store create | 매장 등록하기 |
| Employee invite | 직원 초대하기 |
| Punch in | 출근하기 |
| Punch out | 퇴근하기 |
| Correction | 정정 요청 보내기 |
| Time off | 휴가 신청하기 |
| Payroll run | 급여 정산 시작 |
| Payroll issue | 명세서 발급하기 |
| Subscribe | 결제 수단 관리 |

## Secondary CTA Copy

| Context | CTA |
|---|---|
| Auth | 이미 계정이 있어요 |
| Permission fallback | 사장님께 수동 요청 |
| Store success | 대시보드로 가기 |
| Payroll success | 급여 목록으로 |
| Error | 고객지원 보기 |
| Form cancel | 다시 확인 |
| Sheet close | 취소 |

## Empty State Copy

| Screen | Title | Description | CTA |
|---|---|---|---|
| Employee list | 아직 직원이 없어요 | 초대 코드를 보내면 직원이 직접 가입하고 출퇴근을 시작할 수 있어요. | 직원 초대하기 |
| Store list | 아직 매장이 없어요 | 첫 매장을 등록하면 직원 초대와 급여 정산을 시작할 수 있어요. | 매장 등록하기 |
| Salary list | 아직 급여 내역이 없어요 | 첫 정산을 실행하면 직원별 명세서가 여기에 쌓여요. | 급여 정산 시작 |
| Attendance calendar | 아직 기록이 없어요 | 출근을 시작하면 근무 기록이 자동으로 쌓입니다. | 출근하기 |
| Notification | 새 알림이 없어요 | 중요한 출퇴근과 급여 알림이 생기면 알려드릴게요. | 확인 |
| QnA | 아직 질문이 없어요 | 궁금한 점을 남기면 답변을 확인할 수 있어요. | 질문 남기기 |
| Personal workplace | 아직 근무지가 없어요 | 내가 일하는 곳을 등록하고 시간을 직접 기록하세요. | 근무지 추가 |

## Error Copy

| Situation | Title | Description | CTA |
|---|---|---|---|
| Network | 잠시 연결이 불안정해요 | 기록은 사라지지 않습니다. 다시 연결되면 이어서 처리할게요. | 다시 시도 |
| Login fail | 로그인 정보를 확인해 주세요 | 이메일 또는 비밀번호가 맞지 않아요. | 다시 입력 |
| Invalid code | 초대 코드를 확인해 주세요 | 사장님 앱에 표시된 코드를 그대로 입력해 주세요. | 다시 입력 |
| Payroll fail | 급여를 계산하지 못했어요 | 출퇴근 기록 또는 시급 정보를 다시 확인해 주세요. | 다시 계산 |
| Permission denied | 권한이 꺼져 있어요 | 이 기능을 쓰려면 설정에서 권한을 켜야 합니다. | 설정 열기 |
| Server | 처리하지 못했어요 | 잠시 후 다시 시도해 주세요. 문제가 계속되면 문의해 주세요. | 다시 시도 |

## Success Copy

| Situation | Title | Description | CTA |
|---|---|---|---|
| Store created | 매장 등록이 끝났어요 | 이제 직원에게 초대 코드를 보내 출퇴근을 시작할 수 있어요. | 직원 초대하기 |
| Join store | 매장에 가입했어요 | 오늘부터 출퇴근 기록과 급여명세를 확인할 수 있어요. | 출근 화면으로 |
| Punch in | 출근 처리됐어요 | 출근 시간과 적용 시급을 기록했어요. | 근무 시작 |
| Punch out | 퇴근 처리됐어요 | 오늘 근무시간과 예상 일급을 확인해 보세요. | 기록 보기 |
| Correction sent | 정정 요청을 보냈어요 | 사장님이 승인하면 기록에 반영됩니다. | 근무 기록으로 |
| Time off sent | 휴가 신청을 보냈어요 | 승인 결과는 알림으로 알려드릴게요. | 내 정보로 |
| Payroll issued | 명세서 발급이 끝났어요 | 직원에게 급여명세 알림을 보냈어요. | 급여 목록으로 |
| Password reset | 메일을 보냈어요 | 받은 편지함에서 재설정 링크를 확인해 주세요. | 로그인으로 |

## Confirm Sheet Copy

### Logout

Title: 로그아웃할까요?  
Description: 다시 로그인하면 모든 기록을 이어서 볼 수 있어요.  
Primary: 로그아웃  
Secondary: 취소

### Checkout

Title: 퇴근 처리할까요?  
Description: 오늘 근무시간과 예상 일급을 확인한 뒤 퇴근 처리합니다.  
Primary: 퇴근 처리  
Secondary: 휴게시간 추가

### Payroll Issue

Title: 명세서를 발급할까요?  
Description: 발급하면 직원에게 알림이 전송됩니다. 발급 후 24시간 안에는 취소할 수 있어요.  
Primary: 명세서 발급  
Secondary: 다시 확인

### Account Delete

Title: 정말 탈퇴할까요?  
Description: 계정과 서비스 이용 기록이 제한됩니다. 법적으로 보관이 필요한 기록은 정책에 따라 보관될 수 있어요.  
Primary: 탈퇴하기  
Secondary: 취소

## Validation Copy

| Field | Copy |
|---|---|
| email empty | 이메일을 입력해 주세요 |
| email invalid | 이메일 형식을 확인해 주세요 |
| password short | 비밀번호는 8자 이상 입력해 주세요 |
| required name | 이름을 입력해 주세요 |
| store name | 매장명을 입력해 주세요 |
| address | 매장 주소를 선택해 주세요 |
| wage | 시급을 입력해 주세요 |
| wage too low | 최저시급보다 낮아요. 다시 확인해 주세요 |
| correction reason | 정정 사유를 입력해 주세요 |
| timeoff date | 휴가 기간을 선택해 주세요 |
| invite code | 초대 코드를 입력해 주세요 |

## Notification Copy

| Event | Title | Body |
|---|---|---|
| employee missing | 민지님이 아직 출근 전이에요 | 예정 시간보다 12분 지났어요. |
| correction request | 정정 요청이 도착했어요 | 지아님이 퇴근 시간 정정을 요청했어요. |
| payroll ready | 급여 정산 준비가 거의 끝났어요 | 5월 정산 준비율이 83%입니다. |
| payslip issued | 급여명세서가 발급됐어요 | 이번 달 급여명세를 확인해 보세요. |
| timeoff approved | 휴가 신청이 승인됐어요 | 신청한 기간을 확인해 주세요. |
| timeoff rejected | 휴가 신청이 반려됐어요 | 사유를 확인해 주세요. |

## Legal / Footer Copy

앱 내부 하단:

```text
소담
약관 · 개인정보처리방침 · 사업자 정보
```

법적 정보는 앱 주요 업무 흐름에 반복 노출하지 않는다. `내 정보` 또는 `설정` 하단에만 배치한다.
