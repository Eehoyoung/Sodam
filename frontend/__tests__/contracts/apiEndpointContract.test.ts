/**
 * WP-00. FE→BE 계약 기준선 (docs/260718/FE_BE_CORE_배선_리팩터링_작업계획서.md §7.4.1).
 *
 * frontend/src 전체의 `api.*` 호출(296라인, 실호출 281건)과 raw axios 호출을 서비스 파일 단위로
 * 정규화 경로(method + normalizedPath)로 고정한다. status:
 *   - MATCH:    backend/.../controller 에 대응 매핑이 존재 (2026-07-19 실측 대조 완료)
 *   - FE_ONLY:  BE 에 대응 엔드포인트가 없음 — 호출하면 404 또는 라우팅 자체가 안 됨(실패 재현 대상)
 *
 * 이 테스트는 제품 코드를 변경하지 않는다 — "현재 상태"를 고정하는 characterization test다.
 * FE_ONLY 항목이 WP-03/WP-04 등에서 해소되면 그 항목을 이 배열에서 status:'MATCH' 로 옮기고,
 * §2의 개별 실패 재현 테스트도 함께 뒤집는다. 상세 근거: docs/260718/WP-00_계약_기준선_인벤토리.md
 */

type ContractStatus = 'MATCH' | 'FE_ONLY';

interface ContractEntry {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  file: string;
  status: ContractStatus;
}

const E = (method: ContractEntry['method'], path: string, file: string, status: ContractStatus = 'MATCH'): ContractEntry =>
  ({method, path, file, status});

// ─── 1. 인증/세션 ───────────────────────────────────────────────────────
const AUTH: ContractEntry[] = [
  E('POST', '/api/login', 'auth/services/authApi.ts'),
  E('POST', '/api/join', 'auth/services/authApi.ts'),
  E('POST', '/api/auth/refresh', 'auth/services/authApi.ts'),
  E('GET', '/api/auth/email-check', 'auth/services/authApi.ts'),
  E('POST', '/api/users/{userId}/purpose', 'auth/services/authApi.ts'),
  E('POST', '/api/auth/consents', 'auth/services/authApi.ts'),
  E('PUT', '/api/auth/consents/location', 'auth/services/authApi.ts'),
  E('POST', '/api/auth/password-reset/request', 'auth/services/passwordResetApi.ts'),
  E('POST', '/api/auth/password-reset/verify', 'auth/services/passwordResetApi.ts'),
  E('POST', '/api/auth/password-reset/confirm', 'auth/services/passwordResetApi.ts'),
  E('POST', '/api/auth/logout', 'auth/services/authService.ts'),
  E('POST', '/api/logout', 'auth/services/authService.ts'),
  E('GET', '/api/auth/me', 'auth/services/authService.ts'),
  E('GET', '/api/me', 'auth/services/authService.ts'),
  E('GET', '/kakao/auth/proc', 'auth/services/authService.ts'),
  E('POST', '/apple/auth/proc', 'auth/services/authService.ts'),
  E('POST', '/api/users/{userId}/purpose', 'auth/services/userService.ts'),
  E('GET', '/api/user/{userId}', 'auth/services/userService.ts'),
  E('PUT', '/api/user/{employeeId}', 'auth/services/userService.ts'),
  E('PUT', '/api/user/me/profile-basics', 'auth/services/userService.ts'),
];

// ─── 2. 출퇴근 ──────────────────────────────────────────────────────────
const ATTENDANCE: ContractEntry[] = [
  E('GET', '/api/attendance/employee/{employeeId}/work-log', 'attendance/services/attendanceService.ts'),
  E('GET', '/api/attendance/employee/{employeeId}', 'attendance/services/attendanceService.ts'),
  E('POST', '/api/attendance/check-in/nfc', 'attendance/services/attendanceService.ts'),
  E('POST', '/api/attendance/check-out/nfc', 'attendance/services/attendanceService.ts'),
  E('GET', '/api/attendance/{attendanceId}', 'attendance/services/attendanceService.ts', 'FE_ONLY'),
  E('POST', '/api/attendance/check-in', 'attendance/services/attendanceService.ts'),
  E('POST', '/api/attendance/check-out', 'attendance/services/attendanceService.ts'),
  E('PUT', '/api/attendance/{attendanceId}', 'attendance/services/attendanceService.ts', 'FE_ONLY'),
  E('DELETE', '/api/attendance/{attendanceId}', 'attendance/services/attendanceService.ts', 'FE_ONLY'),
  E('GET', '/api/attendance/employee/{empId}/today', 'attendance/services/attendanceService.ts'),
  E('GET', '/api/attendance/statistics', 'attendance/services/attendanceService.ts', 'FE_ONLY'),
  E('GET', '/api/attendance/statistics/employee/{employeeId}', 'attendance/services/attendanceService.ts', 'FE_ONLY'),
  E('GET', '/api/attendance/statistics/store/{storeId}', 'attendance/services/attendanceService.ts', 'FE_ONLY'),
  E('PUT', '/api/attendance/batch-status', 'attendance/services/attendanceService.ts', 'FE_ONLY'),
  E('POST', '/api/attendance/verify/location', 'attendance/services/attendanceService.ts'),
  E('POST', '/api/attendance/verify/location', 'attendance/services/locationAttendanceService.ts'),
  E('POST', '/api/attendance/verify/nfc', 'attendance/services/nfcAttendanceService.ts'),
  E('GET', '/api/stores/{storeId}/nfc-tag', 'attendance/services/nfcAttendanceService.ts', 'FE_ONLY'),
  E('GET', '/api/stores/{storeId}/nfc-settings', 'attendance/services/nfcAttendanceService.ts', 'FE_ONLY'),
  E('PUT', '/api/stores/{storeId}/nfc-settings', 'attendance/services/nfcAttendanceService.ts', 'FE_ONLY'),
  E('POST', '/api/attendance/approval-requests', 'attendance/services/attendanceApprovalService.ts'),
  E('GET', '/api/attendance/approval-requests/mine', 'attendance/services/attendanceApprovalService.ts'),
  E('GET', '/api/stores/{storeId}/approval-requests', 'attendance/services/attendanceApprovalService.ts'),
  E('POST', '/api/attendance/approval-requests/{id}/approve', 'attendance/services/attendanceApprovalService.ts'),
  E('POST', '/api/attendance/approval-requests/{id}/reject', 'attendance/services/attendanceApprovalService.ts'),
  E('GET', '/api/stores/{storeId}/attendance-irregularities', 'attendance/services/attendanceIrregularityService.ts'),
  E('POST', '/api/stores/{storeId}/attendance-irregularities/{id}/waive', 'attendance/services/attendanceIrregularityService.ts'),
  E('POST', '/api/stores/{storeId}/attendance-irregularities/{id}/deduct', 'attendance/services/attendanceIrregularityService.ts'),
  E('POST', '/api/stores/{storeId}/attendance-irregularities/{id}/convert-to-leave', 'attendance/services/attendanceIrregularityService.ts'),
  E('GET', '/api/attendance-irregularities/my', 'attendance/services/attendanceIrregularityService.ts'),
  E('POST', '/api/stores/{storeId}/attendance-notices', 'attendance/services/attendanceIrregularityService.ts'),
  E('GET', '/api/attendance/employee/{userId}/monthly', 'attendance/screens/AttendanceCalendarScreen.tsx'),
  E('POST', '/api/attendance/{attendanceId}/correction-request', 'attendance/screens/AttendanceCorrectionRequestScreen.tsx'),
  E('GET', '/api/stores/master/current', 'attendance/screens/MissingAttendanceCenterScreen.tsx'),
  E('GET', '/api/store-queries/{id}/stats/today', 'attendance/screens/MissingAttendanceCenterScreen.tsx'),
  E('POST', '/api/notifications/push-to-employee', 'attendance/screens/MissingAttendanceCenterScreen.tsx'),
  E('GET', '/api/attendance/employee/{userId}/store/{storeId}/today', 'attendance/screens/EmployeeAttendanceHome.tsx'),
  E('GET', '/api/attendance/employee/{userId}/monthly', 'attendance/screens/EmployeeAttendanceHome.tsx'),
  E('GET', '/api/wages/employee/{userId}/store/{storeId}', 'attendance/screens/EmployeeAttendanceHome.tsx'),
];

// ─── 3. 홈/정보 콘텐츠 (raw axios 우회 + 4개 content 도메인 필터 갭) ─────
const HOME_INFO: ContractEntry[] = [
  E('GET', '/api/v1/events', 'home/services/homeService.ts (raw axios)', 'FE_ONLY'),
  E('GET', '/api/v1/labor-info', 'home/services/homeService.ts (raw axios)', 'FE_ONLY'),
  E('GET', '/api/v1/policies', 'home/services/homeService.ts (raw axios)', 'FE_ONLY'),
  E('GET', '/api/v1/tax-info', 'home/services/homeService.ts (raw axios)', 'FE_ONLY'),
  E('GET', '/api/v1/tips', 'home/services/homeService.ts (raw axios)', 'FE_ONLY'),
  E('GET', '/api/v1/testimonials', 'home/services/homeService.ts (raw axios)', 'FE_ONLY'),
  E('GET', '/api/v1/services', 'home/services/homeService.ts (raw axios)', 'FE_ONLY'),
  E('GET', '/api/labor-info/current', 'services/laborInfoService.ts'),
  E('GET', '/api/labor-info/{id}', 'services/laborInfoService.ts'),
  E('GET', '/api/labor-info', 'info/services/laborInfoService.ts'),
  E('GET', '/api/labor-info/{infoId}', 'info/services/laborInfoService.ts'),
  E('GET', '/api/labor-info/search/title', 'info/services/laborInfoService.ts', 'FE_ONLY'),
  E('GET', '/api/labor-info/recent', 'info/services/laborInfoService.ts'),
  E('GET', '/api/labor-info/popular', 'info/services/laborInfoService.ts', 'FE_ONLY'),
  E('GET', '/api/policy-info', 'info/services/policyService.ts'),
  E('GET', '/api/policy-info/{policyId}', 'info/services/policyService.ts'),
  E('GET', '/api/policy-info/search/title', 'info/services/policyService.ts', 'FE_ONLY'),
  E('GET', '/api/policy-info/recent', 'info/services/policyService.ts'),
  E('GET', '/api/policy-info/deadline', 'info/services/policyService.ts', 'FE_ONLY'),
  E('GET', '/api/policy-info/region', 'info/services/policyService.ts', 'FE_ONLY'),
  E('GET', '/api/tax-info', 'info/services/taxInfoService.ts'),
  E('GET', '/api/tax-info/{infoId}', 'info/services/taxInfoService.ts'),
  E('GET', '/api/tax-info/search/title', 'info/services/taxInfoService.ts', 'FE_ONLY'),
  E('GET', '/api/tax-info/recent', 'info/services/taxInfoService.ts'),
  E('GET', '/api/tax-info/year', 'info/services/taxInfoService.ts', 'FE_ONLY'),
  E('GET', '/api/tax-info/group', 'info/services/taxInfoService.ts', 'FE_ONLY'),
  E('GET', '/api/tip-info', 'info/services/tipsService.ts'),
  E('GET', '/api/tip-info/{tipId}', 'info/services/tipsService.ts'),
  E('GET', '/api/tip-info/search/title', 'info/services/tipsService.ts'),
  E('GET', '/api/tip-info/recent', 'info/services/tipsService.ts'),
  E('GET', '/api/tip-info/popular', 'info/services/tipsService.ts', 'FE_ONLY'),
  E('GET', '/api/tip-info/difficulty', 'info/services/tipsService.ts', 'FE_ONLY'),
  E('GET', '/api/qna-info', 'qna/services/qnaService.ts'),
  E('GET', '/api/qna-info/{id}', 'qna/services/qnaService.ts'),
  E('POST', '/api/qna-info', 'qna/services/qnaService.ts'),
  E('POST', '/api/inquiries', 'qna/services/inquiryService.ts'),
  E('GET', '/api/campaigns/active', 'home (계획서 §5 F-01 대체 경로 — BE 실제 컨트롤러)'),
];

// ─── 4. 매장/직원 ───────────────────────────────────────────────────────
const STORE: ContractEntry[] = [
  E('GET', '/api/stores/master/{userIdOrCurrent}', 'workplace/services/workplaceService.ts'),
  E('GET', '/api/stores/{id}', 'workplace/services/workplaceService.ts'),
  E('POST', '/api/stores/registration', 'workplace/services/workplaceService.ts'),
  E('PUT', '/api/stores/{id}', 'workplace/services/workplaceService.ts'),
  E('DELETE', '/api/stores/{id}', 'workplace/services/workplaceService.ts'),
  E('GET', '/api/stores/{storeId}/employees', 'workplace/services/workplaceService.ts'),
  E('GET', '/api/personal-users/{userId}/annual-tax-summary', 'workplace/services/personalTaxService.ts'),
  E('GET', '/api/stores/{storeId}/payroll-cycle/period', 'store/services/storeService.ts'),
  E('GET', '/api/stores/master/{userId}', 'store/services/storeService.ts'),
  E('GET', '/api/stores/employee/{userId}', 'store/services/storeService.ts'),
  E('GET', '/api/stores/{storeId}/operating-hours', 'store/services/storeService.ts'),
  E('PUT', '/api/stores/{storeId}/operating-hours', 'store/services/storeService.ts'),
  E('PUT', '/api/stores/{storeId}/location', 'store/services/storeService.ts'),
  E('POST', '/api/stores/change/master', 'store/services/storeService.ts', 'FE_ONLY'),
  E('GET', '/api/stores/{storeId}/setup-progress', 'store/services/setupService.ts'),
  E('POST', '/api/stores/{storeId}/nfc-tags', 'store/services/nfcTagService.ts'),
  E('GET', '/api/stores/{storeId}/nfc-tags', 'store/services/nfcTagService.ts'),
  E('DELETE', '/api/stores/{storeId}/nfc-tags/{tagPk}', 'store/services/nfcTagService.ts'),
  E('PATCH', '/api/stores/{storeId}/nfc-tags/{tagPk}/activate', 'store/services/nfcTagService.ts'),
  E('GET', '/api/stores/{storeId}/insights/weekly', 'store/services/insightsService.ts'),
  E('GET', '/api/stores/{storeId}/subsidy/eligibility', 'store/services/subsidyService.ts'),
  E('POST', '/api/stores/{storeId}/managers', 'manager/services/managerService.ts'),
  E('GET', '/api/stores/{storeId}/managers', 'manager/services/managerService.ts'),
  E('PUT', '/api/stores/{storeId}/managers/{employeeId}', 'manager/services/managerService.ts'),
  E('GET', '/api/me/managed-stores', 'manager/services/managerService.ts'),
  E('DELETE', '/api/stores/{storeId}/managers/{employeeId}', 'manager/services/managerService.ts'),
  E('GET', '/api/stores/{storeId}/delegation-audit', 'manager/services/managerService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/minor-guard', 'minorguard/services/minorGuardService.ts'),
  E('GET', '/api/stores/{storeId}', 'store/screens/WageSettingsScreen.tsx'),
  E('GET', '/api/stores/{storeId}', 'store/screens/StoreEditScreen.tsx'),
  E('PUT', '/api/stores/{storeId}', 'store/screens/StoreEditScreen.tsx'),
  E('POST', '/api/stores/join-by-code', 'store/screens/JoinStoreByCodeScreen.tsx'),
  E('PUT', '/api/stores/{storeId}/employees/{employeeId}/active', 'store/screens/EmployeeDetailScreen.tsx'),
  E('GET', '/api/user/{employeeId}', 'store/screens/EmployeeDetailScreen.tsx'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/memo', 'store/screens/EmployeeDetailScreen.tsx'),
  E('PUT', '/api/stores/{storeId}/employees/{employeeId}/memo', 'store/screens/EmployeeDetailScreen.tsx'),
  E('GET', '/api/attendance/employee/{employeeId}/monthly', 'store/screens/EmployeeDetailScreen.tsx'),
  E('GET', '/api/payroll/employee/{employeeId}', 'store/screens/EmployeeDetailScreen.tsx'),
  E('GET', '/api/stores/master/current', 'home/screens/OwnerDashboardScreen.tsx'),
  E('GET', '/api/store-queries/{storeId}/stats/today', 'home/screens/OwnerDashboardScreen.tsx'),
  E('GET', '/api/stores/{storeId}/operating-hours', 'store/screens/StoreOperatingHoursScreen.tsx'),
  E('PUT', '/api/stores/{storeId}/operating-hours', 'store/screens/StoreOperatingHoursScreen.tsx'),
];

// ─── 5. 급여/정산/세무 ──────────────────────────────────────────────────
const PAYROLL: ContractEntry[] = [
  E('GET', '/api/wage/my/history', 'wage/services/myWageService.ts'),
  E('PUT', '/api/wages/store/{storeId}/standard', 'wage/services/wageService.ts'),
  E('GET', '/api/wages/employee/{employeeId}/store/{storeId}', 'wage/services/wageService.ts'),
  E('POST', '/api/wages/employee', 'wage/services/wageService.ts'),
  E('GET', '/api/payroll/employee/{employeeId}/wages', 'wage/services/wageService.ts'),
  E('POST', '/api/stores/{storeId}/employment-amendments', 'wage/services/wageService.ts'),
  E('POST', '/api/stores/{storeId}/employment-amendments/{amendmentId}/send', 'wage/services/wageService.ts'),
  E('DELETE', '/api/stores/{storeId}/employment-amendments/{amendmentId}', 'wage/services/wageService.ts'),
  E('POST', '/api/payroll/calculate', 'salary/services/payrollService.ts'),
  E('GET', '/api/payroll/employee/{employeeId}/store/{storeId}/monthly', 'salary/services/payrollService.ts'),
  E('GET', '/api/payroll/{payrollId}', 'salary/services/payrollService.ts'),
  E('GET', '/api/payroll/{payrollId}/details', 'salary/services/payrollService.ts'),
  E('PUT', '/api/payroll/{payrollId}/status', 'salary/services/payrollService.ts'),
  E('GET', '/api/payroll/employee/{employeeId}', 'salary/services/payrollService.ts'),
  E('GET', '/api/payroll/store/{storeId}', 'salary/services/payrollService.ts'),
  E('GET', '/api/stores/{storeId}/overtime-check', 'salary/services/overtimeService.ts'),
  E('GET', '/api/stores/{storeId}/tax/headcount-trend', 'salary/services/employmentCreditService.ts'),
  E('GET', '/api/stores/{storeId}/ledger/wage', 'salary/services/ledgerService.ts'),
  E('GET', '/api/stores/{storeId}/ledger/roster', 'salary/services/ledgerService.ts'),
  E('GET', '/api/stores/{storeId}/payroll-preview', 'salary/services/payrollPreviewService.ts'),
  E('GET', '/api/salary/prediction', 'salary/services/salaryPredictionService.ts', 'FE_ONLY'),
  E('GET', '/api/stores/{storeId}/tax/withholding-monthly', 'salary/services/taxMonthlyService.ts'),
  E('GET', '/api/stores/{storeId}/tax/vat-deadline', 'salary/services/taxMonthlyService.ts'),
  E('GET', '/api/stores/{storeId}/tax-reports/history', 'salary/services/taxReportService.ts'),
  E('POST', '/api/stores/{storeId}/tax-reports/send', 'salary/services/taxReportService.ts'),
  E('PUT', '/api/stores/{storeId}/tax-reports/accountant-email', 'salary/services/taxReportService.ts'),
  E('GET', '/api/tax/simulate', 'salary/services/taxSimulatorService.ts'),
  E('GET', '/api/stores/{storeId}/tax/withholding-statement', 'salary/services/taxStatementService.ts'),
  E('POST', '/api/stores/{storeId}/bonuses', 'bonus/services/bonusService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/bonuses', 'bonus/services/bonusService.ts'),
  E('GET', '/api/bonuses/my', 'bonus/services/bonusService.ts'),
  E('GET', '/api/wages/store/{storeId}/history', 'store/screens/WageSettingsScreen.tsx'),
  E('PUT', '/api/wages/store/{storeId}/standard', 'store/screens/WageSettingsScreen.tsx'),
  E('POST', '/api/payroll/calculate', 'salary/screens/PayrollRunScreen.tsx'),
  E('PUT', '/api/payroll/{payrollId}/issue', 'salary/screens/PayrollRunScreen.tsx'),
];

// ─── 6. 스케줄/휴무/교대 ────────────────────────────────────────────────
const SCHEDULE: ContractEntry[] = [
  E('GET', '/api/shifts/my', 'shift/services/shiftService.ts'),
  E('GET', '/api/stores/{storeId}/shifts', 'shift/services/shiftService.ts'),
  E('POST', '/api/stores/{storeId}/shifts', 'shift/services/shiftService.ts'),
  E('PUT', '/api/stores/{storeId}/shifts/{shiftId}', 'shift/services/shiftService.ts'),
  E('DELETE', '/api/stores/{storeId}/shifts/{shiftId}', 'shift/services/shiftService.ts'),
  E('POST', '/api/stores/{storeId}/shifts/notify', 'shift/services/shiftService.ts'),
  E('GET', '/api/stores/{storeId}/shift-templates', 'shift/services/shiftService.ts'),
  E('POST', '/api/stores/{storeId}/shift-templates', 'shift/services/shiftService.ts'),
  E('POST', '/api/stores/{storeId}/shift-templates/{templateId}/apply', 'shift/services/shiftService.ts'),
  E('DELETE', '/api/stores/{storeId}/shift-templates/{templateId}', 'shift/services/shiftService.ts'),
  E('GET', '/api/stores/{storeId}/swap-requests', 'shift/services/swapService.ts'),
  E('POST', '/api/shifts/{shiftId}/swap-requests', 'shift/services/swapService.ts'),
  E('POST', '/api/swap-requests/{requestId}/approve', 'shift/services/swapService.ts'),
  E('POST', '/api/swap-requests/{requestId}/cancel', 'shift/services/swapService.ts'),
  E('GET', '/api/stores/{storeId}/swap-requests', 'shift/services/swapBoardService.ts'),
  E('POST', '/api/swap-requests/{swapRequestId}/apply', 'shift/services/swapBoardService.ts'),
  E('GET', '/api/master/timeoff/pending', 'myPage/services/timeOffService.ts'),
  E('PUT', '/api/master/timeoff/{timeOffId}/approve', 'myPage/services/timeOffService.ts'),
  E('PUT', '/api/master/timeoff/{timeOffId}/reject', 'myPage/services/timeOffService.ts'),
  E('GET', '/api/timeoff/store/{storeId}/status/{status}', 'myPage/services/timeOffService.ts'),
  E('PUT', '/api/timeoff/{timeOffId}/approve', 'myPage/services/timeOffService.ts'),
  E('PUT', '/api/timeoff/{timeOffId}/reject', 'myPage/services/timeOffService.ts'),
  E('GET', '/api/timeoff/my/leave-balance', 'timeoff/services/myLeaveService.ts'),
  E('POST', '/api/timeoff/self', 'timeoff/services/myLeaveService.ts'),
];

// ─── 7. 채용 ────────────────────────────────────────────────────────────
const RECRUITMENT: ContractEntry[] = [
  E('GET', '/api/job-seekers/me', 'recruitment/services/recruitmentService.ts'),
  E('PUT', '/api/job-seekers/me', 'recruitment/services/recruitmentService.ts'),
  E('GET', '/api/stores/{storeId}/job-seekers', 'recruitment/services/recruitmentService.ts'),
  E('POST', '/api/stores/{storeId}/job-offers', 'recruitment/services/recruitmentService.ts'),
  E('GET', '/api/job-offers/me', 'recruitment/services/recruitmentService.ts'),
  E('PUT', '/api/job-offers/{offerId}/respond', 'recruitment/services/recruitmentService.ts'),
  E('PUT', '/api/stores/{storeId}/job-posting', 'recruitment/services/recruitmentService.ts'),
  E('GET', '/api/stores/{storeId}/job-posting', 'recruitment/services/recruitmentService.ts'),
  E('GET', '/api/job-postings/nearby', 'recruitment/services/recruitmentService.ts'),
  E('POST', '/api/job-postings/{postingId}/applications', 'recruitment/services/recruitmentService.ts'),
  E('GET', '/api/job-applications/me', 'recruitment/services/recruitmentService.ts'),
  E('GET', '/api/stores/{storeId}/job-applications', 'recruitment/services/recruitmentService.ts'),
  E('PUT', '/api/job-applications/{applicationId}/respond', 'recruitment/services/recruitmentService.ts'),
  E('GET', '/api/referrals/my-rewards', 'referral/screens/ReferralScreen.tsx'),
  E('GET', '/api/referrals/my-code', 'referral/screens/ReferralScreen.tsx'),
  E('GET', '/api/referrals/my-history', 'referral/screens/ReferralScreen.tsx'),
];

// ─── 8. 전자서명/문서/온보딩/기타 ───────────────────────────────────────
const DOC_MISC: ContractEntry[] = [
  E('GET', '/api/e-sign/envelopes/{envelopeId}', 'electronicSignature/services/electronicSignatureService.ts'),
  E('POST', '/api/e-sign/envelopes/{envelopeId}/signing-request', 'electronicSignature/services/electronicSignatureService.ts'),
  E('POST', '/api/e-sign/envelopes/{envelopeId}/refresh', 'electronicSignature/services/electronicSignatureService.ts'),
  E('GET', '/api/e-sign/envelopes/{envelopeId}/document', 'electronicSignature/services/electronicSignatureService.ts'),
  E('GET', '/api/e-sign/envelopes/{envelopeId}/completion-certificate', 'electronicSignature/services/electronicSignatureService.ts'),
  E('GET', '/api/labor-contracts/my', 'contract/services/contractService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/labor-contracts', 'contract/services/contractService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/labor-contracts/drafts', 'contract/services/contractService.ts'),
  E('DELETE', '/api/stores/{storeId}/labor-contracts/{contractId}', 'contract/services/contractService.ts'),
  E('GET', '/api/stores/{storeId}/labor-contracts/context', 'contract/services/contractService.ts'),
  E('POST', '/api/stores/{storeId}/labor-contracts', 'contract/services/contractService.ts'),
  E('POST', '/api/stores/{storeId}/labor-contracts/{contractId}/send', 'contract/services/contractService.ts'),
  E('GET', '/api/stores/{storeId}/labor-contracts/{contractId}/pdf', 'contract/services/contractService.ts'),
  E('GET', '/api/labor-contracts/{contractId}/pdf', 'contract/services/contractService.ts'),
  E('GET', '/api/stores/{storeId}/employees', 'contract/screens/SendContractScreen.tsx'),
  E('GET', '/api/certificates/my', 'certificate/services/certificateService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/breaks', 'breakrecord/services/breakService.ts'),
  E('POST', '/api/stores/{storeId}/employees/{employeeId}/breaks', 'breakrecord/services/breakService.ts'),
  E('DELETE', '/api/stores/{storeId}/employees/{employeeId}/breaks/{id}', 'breakrecord/services/breakService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/evidence', 'evidence/services/evidenceService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/documents', 'document/services/documentService.ts'),
  E('POST', '/api/stores/{storeId}/employees/{employeeId}/documents', 'document/services/documentService.ts'),
  E('DELETE', '/api/stores/{storeId}/employees/{employeeId}/documents/{docId}', 'document/services/documentService.ts'),
  E('GET', '/api/stores/{storeId}/employees/{employeeId}/onboarding', 'onboarding/services/onboardingService.ts'),
  E('GET', '/api/onboarding/my', 'onboarding/services/onboardingService.ts'),
  E('GET', '/api/requests/my', 'myPage/services/requestService.ts'),
  E('GET', '/api/master/mypage', 'myPage/services/masterService.ts'),
  E('GET', '/api/master/profile', 'myPage/services/masterService.ts'),
  E('PUT', '/api/master/profile', 'myPage/services/masterService.ts'),
  E('GET', '/api/master/stores', 'myPage/services/masterService.ts'),
  E('GET', '/api/master/stats/store/{storeId}', 'myPage/services/masterService.ts'),
  E('GET', '/api/master/stats/overall', 'myPage/services/masterService.ts'),
  E('POST', '/api/stores/{storeId}/purchases/scan', 'purchase/services/purchaseService.ts'),
  E('POST', '/api/stores/{storeId}/purchases', 'purchase/services/purchaseService.ts'),
  E('GET', '/api/stores/{storeId}/purchases', 'purchase/services/purchaseService.ts'),
  E('GET', '/api/stores/{storeId}/purchases/{id}', 'purchase/services/purchaseService.ts'),
  E('PUT', '/api/stores/{storeId}/purchases/{id}', 'purchase/services/purchaseService.ts'),
  E('DELETE', '/api/stores/{storeId}/purchases/{id}', 'purchase/services/purchaseService.ts'),
  E('GET', '/api/stores/{storeId}/purchases/price-trend', 'purchase/services/purchaseService.ts'),
  E('GET', '/api/stores/{storeId}/purchases/reorder', 'purchase/services/purchaseService.ts'),
  E('POST', '/api/stores/{storeId}/daily-sales', 'sales/services/salesService.ts'),
  E('GET', '/api/stores/{storeId}/daily-sales/recent', 'sales/services/salesService.ts'),
  E('GET', '/api/stores/{storeId}/labor-ratio/daily', 'sales/services/salesService.ts'),
  E('GET', '/api/stores/{storeId}/labor-ratio/cycle', 'sales/services/salesService.ts'),
  E('GET', '/api/stores/{storeId}/notices', 'notice/services/noticeService.ts'),
  E('POST', '/api/stores/{storeId}/notices', 'notice/services/noticeService.ts'),
  E('GET', '/api/stores/{storeId}/notices/{noticeId}/reads', 'notice/services/noticeService.ts'),
  E('GET', '/api/notices/my', 'notice/services/noticeService.ts'),
  E('POST', '/api/notices/{noticeId}/ack', 'notice/services/noticeService.ts'),
  E('GET', '/api/stores/{storeId}/labor-risk', 'risk/services/riskService.ts'),
  E('GET', '/api/labor/hiring-cost', 'risk/services/riskService.ts'),
  E('POST', '/api/notifications/token', 'common/services/NotificationService.ts'),
  E('DELETE', '/api/notifications/token', 'common/services/NotificationService.ts'),
  E('GET', '/api/notifications/inbox', 'notification/screens/NotificationCenterScreen.tsx'),
  E('POST', '/api/notifications/inbox/{id}/read', 'notification/screens/NotificationCenterScreen.tsx'),
  E('PUT', '/api/user/me', 'myPage/screens/AccountSettingsScreen.tsx'),
  E('DELETE', '/api/user/{id}', 'myPage/screens/AccountSettingsScreen.tsx'),
  E('GET', '/api/billing/plans', 'subscription/services/subscriptionApi.ts'),
  E('GET', '/api/billing/me', 'subscription/services/subscriptionApi.ts'),
  E('POST', '/api/billing/subscribe/free', 'subscription/services/subscriptionApi.ts'),
  E('POST', '/api/billing/subscribe', 'subscription/services/subscriptionApi.ts'),
  E('POST', '/api/billing/pause', 'subscription/services/subscriptionApi.ts'),
  E('POST', '/api/billing/resume', 'subscription/services/subscriptionApi.ts'),
  E('DELETE', '/api/billing/cancel', 'subscription/services/subscriptionApi.ts'),
];

const ALL_ENTRIES: ContractEntry[] = [
  ...AUTH, ...ATTENDANCE, ...HOME_INFO, ...STORE, ...PAYROLL, ...SCHEDULE, ...RECRUITMENT, ...DOC_MISC,
];

describe('WP-00 계약 기준선 — FE→BE 엔드포인트 인벤토리', () => {
  it('인벤토리에 중복 없는 (method+path+file) 레코드가 최소 200건 이상 고정되어 있다', () => {
    const keys = new Set(ALL_ENTRIES.map(e => `${e.method} ${e.path} :: ${e.file}`));
    expect(keys.size).toBe(ALL_ENTRIES.length);
    expect(ALL_ENTRIES.length).toBeGreaterThanOrEqual(200);
  });

  it('FE_ONLY(BE 대응 없음) 항목이 정확히 알려진 29건으로 고정되어 있다 — 늘거나 줄면 계약이 바뀐 것이므로 인지 필요', () => {
    const feOnly = ALL_ENTRIES.filter(e => e.status === 'FE_ONLY');
    expect(feOnly).toHaveLength(29);
  });

  it('homeService.ts 의 raw axios /api/v1/* 7건은 전부 FE_ONLY다 (wrapper 우회 + BE prefix 불일치, F-01)', () => {
    const v1Calls = ALL_ENTRIES.filter(e => e.path.startsWith('/api/v1/'));
    expect(v1Calls).toHaveLength(7);
    expect(v1Calls.every(e => e.status === 'FE_ONLY')).toBe(true);
  });

  it('출퇴근 상세({id} GET/PUT/DELETE)/통계(3종)/batch-status 총 7건은 BE AttendanceController 에 대응 매핑이 없다(계획서 F-01 재확인)', () => {
    const missing = ALL_ENTRIES.filter(e =>
      e.file.includes('attendanceService.ts') &&
      (e.path === '/api/attendance/{attendanceId}' && (e.method === 'GET' || e.method === 'PUT' || e.method === 'DELETE')
        || e.path.startsWith('/api/attendance/statistics')
        || e.path === '/api/attendance/batch-status'),
    );
    expect(missing).toHaveLength(7);
    expect(missing.every(e => e.status === 'FE_ONLY')).toBe(true);
  });

  it('nfcAttendanceService.ts 의 단수형 /nfc-tag, /nfc-settings(GET/PUT) 3건은 BE에 없다', () => {
    const nfc = ALL_ENTRIES.filter(e => e.file.includes('nfcAttendanceService.ts') && e.status === 'FE_ONLY');
    expect(nfc).toHaveLength(3);
  });

  it('storeService.ts 의 POST /api/stores/change/master 는 BE 코드에서 블록 주석으로 비활성화돼 있다(죽은 엔드포인트)', () => {
    const entry = ALL_ENTRIES.find(e => e.path === '/api/stores/change/master');
    expect(entry?.status).toBe('FE_ONLY');
  });

  it('salaryPredictionService.ts 의 GET /api/salary/prediction 은 BE 어디에도 없다', () => {
    const entry = ALL_ENTRIES.find(e => e.path === '/api/salary/prediction');
    expect(entry?.status).toBe('FE_ONLY');
  });

  it('info 콘텐츠 4도메인(labor/policy/tax/tip-info) 의 필터 서브 경로 중 tip-info/search/title 만 BE에 구현돼 있다', () => {
    const searchTitle = ALL_ENTRIES.filter(e => e.path.endsWith('/search/title'));
    expect(searchTitle).toHaveLength(4);
    const matched = searchTitle.filter(e => e.status === 'MATCH');
    expect(matched).toHaveLength(1);
    expect(matched[0].file).toContain('tipsService.ts');
  });

  it('personal-users 세무 요약은 controller 패키지 밖(personal 서브패키지)에 실존해 MATCH 다 — 1차 BE 조사 스코프 누락을 직접 검증으로 정정', () => {
    const entry = ALL_ENTRIES.find(e => e.path === '/api/personal-users/{userId}/annual-tax-summary');
    expect(entry?.status).toBe('MATCH');
  });

  it('/apple/auth/proc, /kakao/auth/proc 는 LoginController 에 prefix 없이 그대로 존재해 MATCH 다', () => {
    expect(ALL_ENTRIES.find(e => e.path === '/apple/auth/proc')?.status).toBe('MATCH');
    expect(ALL_ENTRIES.find(e => e.path === '/kakao/auth/proc')?.status).toBe('MATCH');
  });

  it('/api/auth/logout ↔ /api/logout, /api/auth/me ↔ /api/me 는 BE 배열 매핑으로 양쪽 다 MATCH 다(G-2 정리 대상, 삭제는 금지)', () => {
    expect(ALL_ENTRIES.find(e => e.path === '/api/auth/logout')?.status).toBe('MATCH');
    expect(ALL_ENTRIES.find(e => e.path === '/api/logout')?.status).toBe('MATCH');
    expect(ALL_ENTRIES.find(e => e.path === '/api/auth/me')?.status).toBe('MATCH');
    expect(ALL_ENTRIES.find(e => e.path === '/api/me')?.status).toBe('MATCH');
  });
});

describe('WP-00 계약 기준선 — 화면 직접 API 호출 (계획서 §3.2 "14개" 재측정: 실제 15개)', () => {
  const DIRECT_SCREENS = [
    'attendance/screens/AttendanceCalendarScreen.tsx',
    'attendance/screens/AttendanceCorrectionRequestScreen.tsx',
    'attendance/screens/EmployeeAttendanceHome.tsx',
    'attendance/screens/MissingAttendanceCenterScreen.tsx',
    'contract/screens/SendContractScreen.tsx',
    'referral/screens/ReferralScreen.tsx',
    'notification/screens/NotificationCenterScreen.tsx',
    'myPage/screens/AccountSettingsScreen.tsx',
    'store/screens/EmployeeDetailScreen.tsx',
    'store/screens/JoinStoreByCodeScreen.tsx',
    'store/screens/StoreEditScreen.tsx',
    'home/screens/OwnerDashboardScreen.tsx',
    'store/screens/StoreOperatingHoursScreen.tsx',
    'store/screens/WageSettingsScreen.tsx',
    'salary/screens/PayrollRunScreen.tsx',
  ];

  it('화면이 common/utils/api 를 직접 import 하는 지점이 15개로 고정되어 있다(WP-01/04에서 feature service 뒤로 이관 대상)', () => {
    expect(DIRECT_SCREENS).toHaveLength(15);
    expect(new Set(DIRECT_SCREENS).size).toBe(15);
  });
});
