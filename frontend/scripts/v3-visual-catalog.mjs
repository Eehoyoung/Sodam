import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(frontendRoot, '..');
const outputRoot = resolve(repositoryRoot, 'artifacts', 'v3-visual');
const manifest = JSON.parse(await readFile(join(outputRoot, 'manifest.json'), 'utf8'));
const strictReportPath = join(outputRoot, 'native-strict-report.json');
const strictResults = existsSync(strictReportPath)
    ? new Map((JSON.parse(await readFile(strictReportPath, 'utf8')).results ?? []).map(result => [result.id, result.status]))
    : new Map();

/**
 * Card -> real RN target -> deterministic fixture profile.
 *
 * This catalog is deliberately explicit: a card is not considered covered
 * merely because a similarly named source file exists. `#fragment` names the
 * sheet/state rendered by the target component. It is a planning and capture
 * contract, not a screenshot renderer.
 */
const numeric = new Map([
    ['000', ['src/features/welcome/screens/SplashScreen.tsx', 'anonymous-launch']],
    ['001', ['src/features/auth/screens/RoleStartScreen.tsx', 'anonymous-role-start']],
    ['002', ['src/features/welcome/screens/SodamLandingScreen.tsx', 'anonymous-landing']],
    ['003', ['src/features/welcome/screens/OnboardingCarouselScreen.tsx', 'anonymous-onboarding-slide-1']],
    ['004', ['src/features/auth/screens/LoginScreen.tsx', 'anonymous-login']],
    ['005', ['src/features/auth/screens/SignupScreen.tsx', 'anonymous-signup-step-1']],
    ['006', ['src/features/auth/screens/PasswordResetScreen.tsx', 'anonymous-password-reset-email']],
    ['007', ['src/features/auth/screens/KakaoLoginScreen.tsx', 'anonymous-kakao-consent']],
    ['008', ['src/features/home/screens/OwnerDashboardScreen.tsx#OwnerDashboardContent', 'owner-dashboard']],
    ['009', ['src/features/home/screens/HomeScreen.tsx', 'employee-home']],
    ['010', ['src/features/home/screens/OwnerDashboardDetailScreen.tsx', 'owner-dashboard-detail']],
    ['011', ['src/features/store/screens/StoreListScreen.tsx', 'owner-multi-store']],
    ['012', ['src/features/store/StoreRegistraionScreen.tsx', 'owner-store-registration-step-1']],
    ['013', ['src/features/store/screens/StoreDetailScreen.tsx', 'owner-store-detail']],
    ['014', ['src/features/store/screens/StoreEditScreen.tsx', 'owner-store-edit']],
    ['015', ['src/features/workplace/screens/WorkplaceListScreen.tsx', 'employee-workplaces']],
    ['016', ['src/features/workplace/screens/WorkplaceDetailScreen.tsx', 'employee-workplace-detail']],
    ['017', ['src/features/store/screens/EmployeeDetailScreen.tsx', 'owner-employee-detail']],
    ['018', ['src/features/store/screens/WageSettingsScreen.tsx', 'owner-wage-settings']],
    ['019', ['src/features/attendance/screens/AttendanceOverviewScreen.tsx', 'employee-attendance-overview']],
    ['020', ['src/features/attendance/screens/AttendanceScreen.tsx', 'employee-attendance-idle']],
    ['021', ['src/features/attendance/screens/EmployeeAttendanceHome.tsx', 'employee-attendance-multi-store']],
    ['022', ['src/features/attendance/screens/EmployeeAttendanceHome.tsx#working', 'employee-attendance-working']],
    ['023', ['src/features/attendance/screens/AttendanceCalendarScreen.tsx', 'employee-attendance-calendar']],
    ['024', ['src/features/attendance/screens/AttendanceCorrectionRequestScreen.tsx', 'employee-correction-form']],
    ['025', ['src/features/attendance/screens/MissingAttendanceCenterScreen.tsx', 'owner-missing-attendance']],
    ['026', ['src/features/timeoff/screens/TimeOffRequestScreen.tsx', 'employee-time-off-form']],
    ['027', ['src/features/store/screens/JoinStoreByCodeScreen.tsx', 'employee-join-store']],
    ['028', ['src/features/salary/screens/SalaryListScreen.tsx', 'employee-salary-list']],
    ['029', ['src/features/salary/screens/SalaryDetailScreen.tsx', 'employee-salary-detail']],
    ['030', ['src/features/salary/screens/PayrollRunScreen.tsx', 'owner-payroll-run-input']],
    ['031', ['src/features/subscription/screens/SubscribeScreen.tsx', 'owner-subscription']],
    ['032', ['src/features/info/screens/InfoListScreen.tsx', 'owner-info-list']],
    ['033', ['src/features/info/screens/LaborInfoDetailScreen.tsx', 'owner-labor-info']],
    ['034', ['src/features/info/screens/PolicyDetailScreen.tsx', 'owner-policy-info']],
    ['035', ['src/features/info/screens/TaxInfoDetailScreen.tsx', 'owner-tax-info']],
    ['036', ['src/features/info/screens/TipsDetailScreen.tsx', 'owner-tips-info']],
    ['037', ['src/features/qna/screens/QnAScreen.tsx', 'owner-qna-list']],
    ['038', ['src/features/notification/screens/NotificationCenterScreen.tsx', 'employee-notifications']],
    ['039', ['src/features/settings/screens/SettingsScreen.tsx', 'owner-settings']],
    ['040', ['src/features/settings/screens/NotificationSettingsScreen.tsx', 'owner-notification-settings']],
    ['041', ['src/features/settings/screens/SettingsScreen.tsx#my-page', 'owner-my-page']],
    ['042', ['src/features/myPage/screens/AccountSettingsScreen.tsx', 'account-settings']],
    ['043', ['src/features/auth/screens/ProfileScreen.tsx', 'employee-profile']],
    ['044', ['src/features/referral/screens/ReferralScreen.tsx', 'owner-referral']],
    ['045', ['src/features/myPage/screens/PersonalUserScreen.tsx', 'employee-personal-home']],
    ['046', ['src/features/home/screens/OwnerDashboardScreen.tsx#ManagerDashboardContent', 'manager-dashboard']],
    ['047', ['src/common/components/ds/StateViews.tsx#EmptyState', 'state-empty']],
    ['048', ['src/common/components/ds/StateViews.tsx#ErrorState', 'state-error']],
    ['049', ['src/common/components/ds/StateViews.tsx#PermissionState', 'state-permission']],
    ['050', ['src/common/components/ds/StateViews.tsx#LoadingState', 'state-loading']],
    ['051', ['src/features/auth/screens/ConsentScreen.tsx', 'anonymous-terms']],
    ['052', ['src/common/components/store/StoreSwitcherSheet.tsx', 'owner-store-switcher-sheet']],
    ['053', ['src/features/store/components/AddressSearchModal.tsx', 'owner-address-search-sheet']],
    ['054', ['src/features/store/components/StoreSheets.tsx#RadiusSelectorSheet', 'owner-radius-sheet']],
    ['055', ['src/features/store/components/StoreSheets.tsx#InviteShareSheet', 'owner-invite-share-sheet']],
    ['056', ['src/features/store/components/StoreSheets.tsx#EmployeeActionSheet', 'owner-employee-action-sheet']],
    ['057', ['src/features/store/components/StoreSheets.tsx#WageEditSheet', 'owner-wage-edit-sheet']],
    ['058', ['src/features/attendance/components/AttendanceSheets.tsx#AttendanceFilterSheet', 'employee-attendance-filter-sheet']],
    ['059', ['src/features/attendance/screens/AttendanceScreen.tsx#renderNFCReader', 'employee-nfc-scan']],
    ['060', ['src/features/attendance/components/AttendanceSheets.tsx#NfcUnsupportedScreen', 'employee-nfc-unsupported']],
    ['061', ['src/features/attendance/components/AttendanceSheets.tsx#CheckoutConfirmSheet', 'employee-checkout-confirm-sheet']],
    ['062', ['src/features/attendance/components/AttendanceSheets.tsx#PunchSuccessScreen', 'employee-punch-success']],
    ['063', ['src/features/attendance/components/AttendanceSheets.tsx#PunchFailedScreen', 'employee-punch-failed-radius']],
    ['064', ['src/features/attendance/screens/AttendanceCorrectionRequestScreen.tsx#submitted', 'employee-correction-success']],
    ['065', ['src/features/timeoff/screens/TimeOffRequestScreen.tsx#submitted', 'employee-time-off-success']],
    ['066', ['src/features/store/screens/JoinStoreByCodeScreen.tsx#joinedStore', 'employee-join-store-success']],
    ['067', ['src/features/salary/components/PayrollCalculationDetailModal.tsx', 'owner-payroll-calculation-detail-sheet']],
    ['068', ['src/features/salary/screens/PayrollRunScreen.tsx#confirm', 'owner-payroll-issue-confirm']],
    ['069', ['src/features/salary/screens/PayrollRunScreen.tsx#done', 'owner-payroll-issue-success']],
    ['070', ['src/features/salary/screens/PdfPreviewScreen.tsx', 'employee-pdf-preview']],
    ['071', ['src/features/subscription/components/BillingMethodSheet.tsx', 'owner-billing-method-sheet']],
    ['072', ['src/features/subscription/components/PlanDetailSheet.tsx', 'owner-plan-detail-sheet']],
    ['073', ['src/features/qna/screens/QnAScreen.tsx#compose', 'owner-qna-compose']],
    ['074', ['src/features/system/screens/LegalWebviewScreen.tsx', 'legal-webview-fixture']],
    ['075', ['src/features/settings/screens/SettingsScreen.tsx#logoutConfirm', 'account-logout-confirm-sheet']],
    ['076', ['src/features/myPage/screens/AccountSettingsScreen.tsx#withdrawConfirm', 'account-delete-confirm-sheet']],
    ['077', ['src/common/components/ds/ImagePickerSheet.tsx', 'profile-image-picker-no-upload']],
    ['078', ['src/features/attendance/components/AttendanceSheets.tsx#ManualRecordSheet', 'employee-manual-record-sheet']],
    ['079', ['src/features/attendance/components/AttendanceSheets.tsx#BreakTimerSheet', 'employee-break-timer-local-only']],
    ['080', ['src/features/attendance/components/AttendanceSheets.tsx#PersonalRecordEditSheet', 'employee-personal-record-edit-sheet']],
    ['081', ['src/features/visual/V3VisualHarnessScreen.tsx#ToastExamples', 'visual-toast-examples']],
    ['082', ['src/features/visual/V3VisualHarnessScreen.tsx#ComponentRules', 'visual-component-rules']],
    ['153', ['src/features/myPage/screens/MasterMyPageScreen.tsx', 'owner-master-my-page']],
]);

const symbolic = new Map([
    ['R1', ['src/features/recruitment/screens/EmployeeRecruitmentScreen.tsx', 'owner-recruitment-hub']],
    ['R2', ['src/features/recruitment/screens/JobOfferInboxScreen.tsx', 'employee-job-inbox']],
    ['R3', ['src/features/recruitment/screens/JobPostingDetailScreen.tsx', 'employee-job-detail']],
    ['R4', ['src/features/recruitment/screens/JobSeekerDetailScreen.tsx', 'owner-job-seeker-detail']],
    ['R5', ['src/features/recruitment/screens/JobSeekerListScreen.tsx', 'owner-job-seeker-list']],
    ['R6', ['src/features/recruitment/screens/JobSeekingSettingsScreen.tsx', 'employee-job-seeking-settings']],
    ['R7', ['src/features/recruitment/screens/NearbyJobPostingsScreen.tsx', 'employee-nearby-postings']],
    ['R8', ['src/features/recruitment/screens/OurPostingScreen.tsx', 'owner-our-posting']],
    ['C1', ['src/features/contract/screens/ContractSignScreen.tsx', 'employee-contract-sign-link']],
    ['C2', ['src/features/contract/screens/DraftContractsScreen.tsx', 'owner-draft-contracts']],
    ['C3', ['src/features/contract/screens/MyContractScreen.tsx', 'employee-my-contract']],
    ['C4', ['src/features/contract/screens/SendContractScreen.tsx', 'owner-send-contract-readonly']],
    ['C5', ['src/features/document/screens/AddDocumentScreen.tsx', 'owner-add-document']],
    ['C6', ['src/features/document/screens/EmployeeDocumentsScreen.tsx', 'employee-documents']],
    ['C7', ['src/features/electronicSignature/screens/ElectronicSignScreen.tsx', 'owner-electronic-sign-readonly']],
    ['C8', ['src/features/evidence/screens/EvidencePackageScreen.tsx', 'owner-evidence-package']],
    ['C9', ['src/features/certificate/screens/MyCertificateScreen.tsx', 'employee-certificate']],
    ['C10', ['src/features/minorguard/screens/MinorGuardScreen.tsx', 'employee-minor-guard']],
    ['S1', ['src/features/shift/screens/EditShiftScreen.tsx', 'owner-edit-shift']],
    ['S2', ['src/features/shift/screens/MyShiftScreen.tsx', 'employee-my-shift']],
    ['S3', ['src/features/shift/screens/StoreScheduleScreen.tsx', 'owner-schedule-board']],
    ['S4', ['src/features/shift/screens/SwapBoardScreen.tsx', 'employee-swap-board']],
    ['S5', ['src/features/shift/screens/SwapRequestsScreen.tsx', 'owner-swap-requests']],
    ['S6', ['src/features/timeoff/screens/TimeOffApprovalScreen.tsx', 'owner-time-off-approval']],
    ['S7', ['src/features/timeoff/screens/MyLeaveBalanceScreen.tsx', 'employee-leave-balance']],
    ['S8', ['src/features/attendance/screens/AttendanceApprovalScreen.tsx', 'owner-attendance-approval']],
    ['S9', ['src/features/attendance/screens/AttendanceIrregularitiesScreen.tsx', 'owner-attendance-irregularities']],
    ['S10', ['src/features/attendance/screens/AttendanceNoticeScreen.tsx', 'employee-attendance-notice']],
    ['S11', ['src/features/attendance/screens/EmployeeWorkLogScreen.tsx', 'employee-work-log']],
    ['B1', ['src/features/purchase/screens/PurchaseLedgerScreen.tsx', 'owner-purchase-ledger']],
    ['B2', ['src/features/purchase/screens/PurchaseScanScreen.tsx', 'owner-purchase-scan']],
    ['B3', ['src/features/purchase/screens/PurchaseConfirmScreen.tsx', 'owner-purchase-confirm']],
    ['B4', ['src/features/purchase/screens/PriceTrendScreen.tsx', 'owner-price-trend']],
    ['B5', ['src/features/purchase/screens/ReorderHintScreen.tsx', 'owner-reorder-hint']],
    ['B6', ['src/features/sales/screens/DailySalesEntryScreen.tsx', 'owner-daily-sales-entry']],
    ['B7', ['src/features/sales/screens/LaborCostRatioScreen.tsx', 'owner-labor-cost-ratio']],
    ['B8', ['src/features/store/screens/WeeklyInsightsScreen.tsx', 'owner-weekly-insights']],
    ['B9', ['src/features/store/screens/SubsidyEligibilityScreen.tsx', 'owner-subsidy-eligibility']],
    ['B10', ['src/features/risk/screens/HiringCostSimulatorScreen.tsx', 'owner-hiring-cost']],
    ['B11', ['src/features/risk/screens/LaborRiskDashboardScreen.tsx', 'owner-labor-risk']],
    ['W1', ['src/features/salary/screens/PayrollPreviewScreen.tsx', 'employee-payroll-preview']],
    ['W2', ['src/features/salary/screens/SalaryArchiveScreen.tsx', 'employee-salary-archive']],
    ['W3', ['src/features/salary/screens/TaxDeadlineScreen.tsx', 'owner-tax-deadline']],
    ['W4', ['src/features/salary/screens/TaxSimulatorScreen.tsx', 'owner-tax-simulator']],
    ['W5', ['src/features/salary/screens/TaxReportScreen.tsx', 'owner-tax-report']],
    ['W6', ['src/features/salary/screens/WithholdingStatementScreen.tsx', 'employee-withholding']],
    ['W7', ['src/features/wage/screens/MyWageHistoryScreen.tsx', 'employee-wage-history']],
    ['W8', ['src/features/salary/screens/HeadcountTrendScreen.tsx', 'owner-employment-signal']],
    ['W9', ['src/features/salary/screens/LegalLedgerScreen.tsx', 'owner-legal-ledger']],
    ['N1', ['src/features/notice/screens/StoreNoticeListScreen.tsx', 'owner-notice-list']],
    ['N2', ['src/features/notice/screens/WriteNoticeScreen.tsx', 'owner-notice-compose']],
    ['N3', ['src/features/notice/screens/MyNoticeScreen.tsx', 'employee-notice-list']],
    ['N4', ['src/features/myPage/screens/RequestStatusScreen.tsx', 'employee-request-status']],
    ['N5', ['src/features/manager/screens/ManagerAppointSection.tsx', 'owner-manager-appoint']],
    ['N6', ['src/features/myPage/screens/EmployeeMyPageRNScreen.tsx', 'employee-my-page']],
    ['N7', ['src/features/myPage/screens/ManagerMyPageScreen.tsx', 'manager-my-page']],
    ['N8', ['src/features/bonus/screens/SendBonusScreen.tsx', 'owner-send-bonus-readonly']],
    ['N9', ['src/features/workplace/screens/PersonalAnnualTaxScreen.tsx', 'employee-tax-refund']],
    ['N10', ['src/features/breakrecord/screens/BreakRecordScreen.tsx', 'employee-break-record-readonly']],
    ['N11', ['src/features/auth/screens/ConsentScreen.tsx', 'employee-terms']],
    ['N12', ['src/features/auth/screens/ProfileBasicsScreen.tsx', 'employee-profile-basics']],
    ['O1', ['src/features/store/screens/StoreOperatingHoursScreen.tsx', 'owner-operating-hours']],
    ['O2', ['src/features/store/screens/NfcTagManagementScreen.tsx', 'owner-nfc-tags']],
    ['O3', ['src/features/store/screens/EmployeeManagementScreen.tsx', 'owner-employee-management']],
    ['O4', ['src/features/subscription/screens/TossBillingAuthScreen.tsx', 'owner-billing-webview-fixture']],
    ['O5', ['src/features/system/screens/AppUpdateScreen.tsx', 'system-force-update']],
    ['O6', ['src/features/system/screens/MaintenanceScreen.tsx', 'system-maintenance']],
    ['O7', ['src/features/system/screens/PaymentSuccessScreen.tsx', 'owner-payment-success']],
    ['O8', ['src/features/system/screens/PushPrimerSheet.tsx', 'system-push-primer-sheet']],
    ['O9', ['src/features/system/screens/SubscriptionGateScreen.tsx', 'owner-subscription-gate']],
]);

const protectedFlows = new Set(['C4', 'C7', 'N8']);
const backendBlocked = new Map([
    ['079', 'P3 employee break write API is excluded; capture is read-only/local-fixture only.'],
    ['077', 'P4 avatar upload backend is excluded; capture is the existing no-upload state only.'],
]);

async function fixtureReadiness(sourceFile, protectedReadOnly, backendBoundary) {
    if (protectedReadOnly) {
        return {level: 'protected-readonly', signals: []};
    }
    if (backendBoundary) {
        return {level: 'backend-boundary', signals: []};
    }
    if (!sourceFile || !existsSync(join(frontendRoot, sourceFile))) {
        return {level: 'missing-source', signals: []};
    }

    const source = await readFile(join(frontendRoot, sourceFile), 'utf8');
    const signals = [
        ['remote-data', /\buse(?:Suspense)?Query\b|\buseMutation\b|\bapi\.(?:get|post|put|patch|delete)\b/.test(source)],
        ['session', /\buseAuth\b|\bAuthContext\b|\bcurrentUser\b/.test(source)],
        ['navigation', /\buseNavigation\b|\bnavigation\.(?:navigate|reset|goBack)|\buseRoute\b/.test(source)],
        ['timer-or-device', /\bsetInterval\b|\bsetTimeout\b|\bNfc\b|\bGeolocation\b|\bCamera\b/.test(source)],
        ['sheet-or-modal', /\bBottomSheet\b|\bModal\b|\bSheet\b/.test(source)],
    ].filter(([, present]) => present).map(([name]) => name);

    if (signals.includes('remote-data') || signals.includes('session')) {
        return {level: 'fixture-provider', signals};
    }
    if (signals.includes('timer-or-device')) {
        return {level: 'device-state-fixture', signals};
    }
    if (signals.includes('navigation') || signals.includes('sheet-or-modal')) {
        return {level: 'route-state-fixture', signals};
    }
    return {level: 'direct-mount', signals};
}

async function catalogEntry(screen) {
    const card = screen.id.split('--')[1];
    const target = numeric.get(card) ?? symbolic.get(card);
    const [rnTarget, fixture] = target ?? [];
    const sourceFile = rnTarget?.split('#')[0];
    const protectedReadOnly = protectedFlows.has(card);
    const backendBoundary = backendBlocked.get(card) ?? null;
    const readiness = await fixtureReadiness(sourceFile, protectedReadOnly, backendBoundary);
    const nativeReferenceCaptured = existsSync(join(outputRoot, 'native-reference', `${screen.id}.png`));
    const actualCaptured = existsSync(join(outputRoot, 'actual', `${screen.id}.png`));
    return {
        id: screen.id,
        label: screen.label,
        artifact: screen.artifact,
        rnTarget: rnTarget ?? null,
        fixture: fixture ?? null,
        sourceExists: sourceFile ? existsSync(join(frontendRoot, sourceFile)) : false,
        protectedReadOnly,
        backendBoundary,
        fixtureReadiness: readiness.level,
        fixtureSignals: readiness.signals,
        nativeReferenceCaptured,
        actualCaptured,
        nativeCapturePair: nativeReferenceCaptured && actualCaptured,
        strictStatus: strictResults.get(screen.id) ?? 'not-compared',
    };
}

const screens = await Promise.all(manifest.screens.map(catalogEntry));
const summary = {
    canonicalCardCount: manifest.screens.length,
    mapped: screens.filter(screen => screen.rnTarget).length,
    sourceMissing: screens.filter(screen => screen.rnTarget && !screen.sourceExists).length,
    nativeReferenceCaptured: screens.filter(screen => screen.nativeReferenceCaptured).length,
    actualCaptured: screens.filter(screen => screen.actualCaptured).length,
    nativeCapturePairs: screens.filter(screen => screen.nativeCapturePair).length,
    strictPassed: screens.filter(screen => screen.strictStatus === 'passed').length,
    protectedReadOnly: screens.filter(screen => screen.protectedReadOnly).length,
    backendBoundary: screens.filter(screen => screen.backendBoundary).length,
    fixtureReadiness: Object.fromEntries(
        [...new Set(screens.map(screen => screen.fixtureReadiness))]
            .sort()
            .map(level => [level, screens.filter(screen => screen.fixtureReadiness === level).length]),
    ),
};

const report = {
    generatedAt: new Date().toISOString(),
    renderer: 'Android RN native reference versus Android RN service screen',
    strictComparison: {channelThreshold: 0, pixelBudget: 0},
    summary,
    screens,
};
const outputPath = join(outputRoot, 'mapping.json');
await mkdir(dirname(outputPath), {recursive: true});
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(summary));
console.log(`Mapping: ${outputPath}`);

if (summary.canonicalCardCount !== 154 || summary.mapped !== 154 || summary.sourceMissing > 0) {
    process.exitCode = 1;
}
