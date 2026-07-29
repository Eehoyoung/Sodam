/**
 * Development-only, renderer-stable v3 visual comparison harness.
 *
 * A canonical HTML card is a product-spec source, but Chromium and Android
 * do not rasterise gradients, fonts, or text inputs identically. The runner
 * captures (1) an independent native transcription of the card and (2) the
 * actual service screen on the same Android renderer, density, and inset
 * configuration. It never displays a PNG, HTML, or WebView.
 */
import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SodamLogo from '../../common/components/logo/SodamLogo';
import {formatMoney} from '../../common/format/money';
import {formatTimer} from '../../common/format/dateTime';
import {
    AppButton,
    AppBadge,
    AppHeader,
    AppInput,
    AppListItem,
    AppText,
    AmountText,
    Brandmark,
    AppCard,
    BottomSheet,
    CtaStack,
    EmptyState,
    ErrorState,
    HeroNumber,
    ImagePickerSheet,
    LoadingState,
    MoneyCard,
    PermissionState,
    ScreenContainer,
    SegmentedControl,
    StorePassRow,
    StepScaffold,
} from '../../common/components/ds';
import {useThemeColors} from '../../common/hooks/useThemeColors';
import LoginScreen from '../auth/screens/LoginScreen';
import KakaoLoginScreen from '../auth/screens/KakaoLoginScreen';
import SignupScreen from '../auth/screens/SignupScreen';
import RoleStartScreen from '../auth/screens/RoleStartScreen';
import SodamLandingScreen from '../welcome/screens/SodamLandingScreen';
import SplashScreen from '../welcome/screens/SplashScreen';
import OnboardingCarouselScreen from '../welcome/screens/OnboardingCarouselScreen';
import AppUpdateScreen from '../system/screens/AppUpdateScreen';
import MaintenanceScreen from '../system/screens/MaintenanceScreen';
import PaymentSuccessScreen from '../system/screens/PaymentSuccessScreen';
import SubscriptionGateScreen from '../system/screens/SubscriptionGateScreen';
import PushPrimerSheet from '../system/screens/PushPrimerSheet';
import HomeScreen from '../home/screens/HomeScreen';
import AttendanceOverviewScreen, {AttendanceOverviewFixture} from '../attendance/screens/AttendanceOverviewScreen';
import AttendanceScreen, {AttendanceVisualFixture} from '../attendance/screens/AttendanceScreen';
import EmployeeAttendanceHome, {EmployeeAttendanceHomeVisualFixture} from '../attendance/screens/EmployeeAttendanceHome';
import AttendanceCalendarScreen, {AttendanceCalendarVisualFixture} from '../attendance/screens/AttendanceCalendarScreen';
import MissingAttendanceCenterScreen, {MissingAttendanceVisualFixture} from '../attendance/screens/MissingAttendanceCenterScreen';
import PersonalUserScreen, {PersonalUserVisualFixture} from '../myPage/screens/PersonalUserScreen';
import {
    OwnerDashboardContent,
    ManagerDashboardContent,
    OwnerDashboardVisualFixture,
    ManagerDashboardVisualFixture,
} from '../home/screens/OwnerDashboardScreen';
import OwnerDashboardDetailScreen, {OwnerDashboardDetailVisualFixture} from '../home/screens/OwnerDashboardDetailScreen';
import StoreListScreen, {StoreListVisualFixture} from '../store/screens/StoreListScreen';
import StoreRegistrationScreen, {StoreRegistrationVisualFixture} from '../store/StoreRegistraionScreen';
import StoreDetailScreen, {StoreDetailVisualFixture} from '../store/screens/StoreDetailScreen';
import StoreEditScreen, {StoreEditVisualFixture} from '../store/screens/StoreEditScreen';
import WorkplaceListScreen, {WorkplaceListVisualFixture} from '../workplace/screens/WorkplaceListScreen';
import WorkplaceDetailScreen, {WorkplaceDetailVisualFixture} from '../workplace/screens/WorkplaceDetailScreen';
import EmployeeDetailScreen, {EmployeeDetailVisualFixture} from '../store/screens/EmployeeDetailScreen';
import WageSettingsScreen, {WageSettingsVisualFixture} from '../store/screens/WageSettingsScreen';
import MasterMyPageScreen, {MasterMyPageVisualFixture} from '../myPage/screens/MasterMyPageScreen';
import {AttendanceStatus} from '../attendance/types';
import SalaryListScreen, {SalaryListFixture} from '../salary/screens/SalaryListScreen';
import PdfPreviewScreen from '../salary/screens/PdfPreviewScreen';
import SalaryDetailScreen, {SalaryDetailVisualFixture} from '../salary/screens/SalaryDetailScreen';
import PayrollRunScreen, {PayrollRunVisualFixture} from '../salary/screens/PayrollRunScreen';
import PayrollCalculationDetailModal from '../salary/components/PayrollCalculationDetailModal';
import {
    AttendanceFilterSheet,
    BreakTimerSheet,
    CheckoutConfirmSheet,
    ManualRecordSheet,
    NfcUnsupportedScreen,
    PersonalRecordEditSheet,
    PunchFailedScreen,
    PunchSuccessScreen,
} from '../attendance/components/AttendanceSheets';
import AttendanceCorrectionRequestScreen from '../attendance/screens/AttendanceCorrectionRequestScreen';
import TimeOffRequestScreen from '../timeoff/screens/TimeOffRequestScreen';
import JoinStoreByCodeScreen from '../store/screens/JoinStoreByCodeScreen';
import PasswordResetScreen from '../auth/screens/PasswordResetScreen';
import {StoreSwitcherSheet} from '../../common/components/store/StoreSwitcherSheet';
import {RadiusSelectorSheet, InviteShareSheet, EmployeeActionSheet, WageEditSheet} from '../store/components/StoreSheets';
import StoreOperatingHoursScreen, {StoreOperatingHoursVisualFixture} from '../store/screens/StoreOperatingHoursScreen';
import NfcTagManagementScreen, {NfcTagManagementVisualFixture} from '../store/screens/NfcTagManagementScreen';
import EmployeeManagementScreen, {EmployeeManagementVisualFixture} from '../store/screens/EmployeeManagementScreen';
import TossBillingAuthScreen from '../subscription/screens/TossBillingAuthScreen';
import SubscribeScreen, {SubscribeVisualFixture} from '../subscription/screens/SubscribeScreen';
import BillingMethodSheet from '../subscription/components/BillingMethodSheet';
import PlanDetailSheet from '../subscription/components/PlanDetailSheet';
import type {PlanCardView} from '../subscription/components/SubscriptionPlanCard';
import InfoListScreen from '../info/screens/InfoListScreen';
import LaborInfoDetailScreen from '../info/screens/LaborInfoDetailScreen';
import PolicyDetailScreen from '../info/screens/PolicyDetailScreen';
import TaxInfoDetailScreen from '../info/screens/TaxInfoDetailScreen';
import TipsDetailScreen from '../info/screens/TipsDetailScreen';
import QnAScreen from '../qna/screens/QnAScreen';
import LegalWebviewScreen from '../system/screens/LegalWebviewScreen';
import NotificationCenterScreen from '../notification/screens/NotificationCenterScreen';
import type {InfoArticle} from '../info/types';
import SettingsScreen from '../settings/screens/SettingsScreen';
import NotificationSettingsScreen from '../settings/screens/NotificationSettingsScreen';
import AccountSettingsScreen from '../myPage/screens/AccountSettingsScreen';
import ProfileScreen from '../auth/screens/ProfileScreen';
import ReferralScreen from '../referral/screens/ReferralScreen';
import EmployeeRecruitmentScreen from '../recruitment/screens/EmployeeRecruitmentScreen';
import JobOfferInboxScreen from '../recruitment/screens/JobOfferInboxScreen';
import JobPostingDetailScreen from '../recruitment/screens/JobPostingDetailScreen';
import JobSeekerDetailScreen from '../recruitment/screens/JobSeekerDetailScreen';
import JobSeekerListScreen from '../recruitment/screens/JobSeekerListScreen';
import JobSeekingSettingsScreen from '../recruitment/screens/JobSeekingSettingsScreen';
import NearbyJobPostingsScreen from '../recruitment/screens/NearbyJobPostingsScreen';
import OurPostingScreen from '../recruitment/screens/OurPostingScreen';
import type {JobPostingNearbyItem, JobSeekerListItem, JobSeekingProfile} from '../recruitment/types';
import ContractSignScreen from '../contract/screens/ContractSignScreen';
import DraftContractsScreen from '../contract/screens/DraftContractsScreen';
import MyContractScreen from '../contract/screens/MyContractScreen';
import AddDocumentScreen from '../document/screens/AddDocumentScreen';
import EmployeeDocumentsScreen from '../document/screens/EmployeeDocumentsScreen';
import EvidencePackageScreen from '../evidence/screens/EvidencePackageScreen';
import MyCertificateScreen from '../certificate/screens/MyCertificateScreen';
import MinorGuardScreen from '../minorguard/screens/MinorGuardScreen';
import PurchaseLedgerScreen from '../purchase/screens/PurchaseLedgerScreen';
import PurchaseScanScreen from '../purchase/screens/PurchaseScanScreen';
import PurchaseConfirmScreen from '../purchase/screens/PurchaseConfirmScreen';
import PriceTrendScreen from '../purchase/screens/PriceTrendScreen';
import ReorderHintScreen from '../purchase/screens/ReorderHintScreen';
import DailySalesEntryScreen from '../sales/screens/DailySalesEntryScreen';
import LaborCostRatioScreen from '../sales/screens/LaborCostRatioScreen';
import WeeklyInsightsScreen from '../store/screens/WeeklyInsightsScreen';
import SubsidyEligibilityScreen from '../store/screens/SubsidyEligibilityScreen';
import HiringCostSimulatorScreen from '../risk/screens/HiringCostSimulatorScreen';
import LaborRiskDashboardScreen from '../risk/screens/LaborRiskDashboardScreen';
import PayrollPreviewScreen from '../salary/screens/PayrollPreviewScreen';
import SalaryArchiveScreen from '../salary/screens/SalaryArchiveScreen';
import TaxDeadlineScreen from '../salary/screens/TaxDeadlineScreen';
import TaxSimulatorScreen from '../salary/screens/TaxSimulatorScreen';
import TaxReportScreen from '../salary/screens/TaxReportScreen';
import WithholdingStatementScreen from '../salary/screens/WithholdingStatementScreen';
import MyWageHistoryScreen from '../wage/screens/MyWageHistoryScreen';
import HeadcountTrendScreen from '../salary/screens/HeadcountTrendScreen';
import LegalLedgerScreen from '../salary/screens/LegalLedgerScreen';
import type {PayrollPreview} from '../salary/services/payrollPreviewService';
import type {ManagedStore} from '../manager/types';
import StoreNoticeListScreen from '../notice/screens/StoreNoticeListScreen';
import WriteNoticeScreen from '../notice/screens/WriteNoticeScreen';
import MyNoticeScreen from '../notice/screens/MyNoticeScreen';
import RequestStatusScreen from '../myPage/screens/RequestStatusScreen';
import ManagerAppointSection from '../manager/screens/ManagerAppointSection';
import EmployeeMyPageRNScreen from '../myPage/screens/EmployeeMyPageRNScreen';
import ManagerMyPageScreen from '../myPage/screens/ManagerMyPageScreen';
import PersonalAnnualTaxScreen from '../workplace/screens/PersonalAnnualTaxScreen';
import BreakRecordScreen from '../breakrecord/screens/BreakRecordScreen';
import ConsentScreen from '../auth/screens/ConsentScreen';
import ProfileBasicsScreen from '../auth/screens/ProfileBasicsScreen';
import EditShiftScreen, {EditShiftVisualFixture} from '../shift/screens/EditShiftScreen';
import AttendanceNoticeScreen, {AttendanceNoticeVisualFixture} from '../attendance/screens/AttendanceNoticeScreen';
import MyLeaveBalanceScreen, {MyLeaveBalanceVisualFixture} from '../timeoff/screens/MyLeaveBalanceScreen';
import TimeOffApprovalScreen, {TimeOffApprovalVisualFixture} from '../timeoff/screens/TimeOffApprovalScreen';
import MyShiftScreen, {MyShiftVisualFixture} from '../shift/screens/MyShiftScreen';
import AttendanceApprovalScreen, {AttendanceApprovalVisualFixture} from '../attendance/screens/AttendanceApprovalScreen';
import AttendanceIrregularitiesScreen, {AttendanceIrregularitiesVisualFixture} from '../attendance/screens/AttendanceIrregularitiesScreen';
import SwapBoardScreen, {SwapBoardVisualFixture} from '../shift/screens/SwapBoardScreen';
import EmployeeWorkLogScreen, {EmployeeWorkLogVisualFixture} from '../attendance/screens/EmployeeWorkLogScreen';
import SwapRequestsScreen, {SwapRequestsVisualFixture} from '../shift/screens/SwapRequestsScreen';
import StoreScheduleScreen, {StoreScheduleVisualFixture} from '../shift/screens/StoreScheduleScreen';
import {DATE_DIGITS_HELPER, TIME_DIGITS_HELPER} from '../../common/utils/dateTimeInput';
import AppCalendar from '../../common/components/AppCalendar';
import RoleTabBar from '../../common/components/navigation/RoleTabBar';
import {radius, spacing} from '../../theme/tokens';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'V3Visual'>;

export const V3_VISUAL_SCREEN_IDS = {
    welcomeSplash: 'sodam-v3-01-auth--000',
    authRoleStart: 'sodam-v3-01-auth--001',
    authWelcomeMain: 'sodam-v3-01-auth--002',
    authOnboarding: 'sodam-v3-01-auth--003',
    authLogin: 'sodam-v3-01-auth--004',
    authSignup: 'sodam-v3-01-auth--005',
    passwordReset: 'sodam-v3-01-auth--006',
    authKakaoLogin: 'sodam-v3-01-auth--007',
    termsSheet: 'sodam-v3-01-auth--051',
    employeeHome: 'sodam-v3-03-employee--009',
    employeeAttendanceHomeMulti: 'sodam-v3-03-employee--021',
    employeeWorking: 'sodam-v3-03-employee--022',
    attendanceOverview: 'sodam-v3-03-employee--019',
    attendanceAuthentication: 'sodam-v3-03-employee--020',
    nfcUnsupported: 'sodam-v3-03-employee--060',
    punchSuccess: 'sodam-v3-03-employee--062',
    punchFailedRadius: 'sodam-v3-03-employee--063',
    checkoutConfirm: 'sodam-v3-03-employee--061',
    manualRecordSheet: 'sodam-v3-03-employee--078',
    breakTimerSheet: 'sodam-v3-03-employee--079',
    personalRecordEdit: 'sodam-v3-03-employee--080',
    correctionSuccess: 'sodam-v3-03-employee--064',
    timeOffSuccess: 'sodam-v3-03-employee--065',
    joinStoreSuccess: 'sodam-v3-03-employee--066',
    attendanceCorrectionRequest: 'sodam-v3-03-employee--024',
    timeOffRequestForm: 'sodam-v3-03-employee--026',
    joinStoreByCode: 'sodam-v3-03-employee--027',
    attendanceCalendar: 'sodam-v3-03-employee--023',
    missingAttendanceCenter: 'sodam-v3-03-employee--025',
    personalHome: 'sodam-v3-03-employee--045',
    attendanceFilterSheet: 'sodam-v3-03-employee--058',
    nfcScanModal: 'sodam-v3-03-employee--059',
    salaryList: 'sodam-v3-04-payroll--028',
    salaryDetail: 'sodam-v3-04-payroll--029',
    payrollRun: 'sodam-v3-04-payroll--030',
    subscribe: 'sodam-v3-04-payroll--031',
    payrollCalculationDetail: 'sodam-v3-04-payroll--067',
    payrollIssueConfirm: 'sodam-v3-04-payroll--068',
    payrollIssueSuccess: 'sodam-v3-04-payroll--069',
    payrollPdfPreview: 'sodam-v3-04-payroll--070',
    billingMethod: 'sodam-v3-04-payroll--071',
    planDetail: 'sodam-v3-04-payroll--072',
    infoList: 'sodam-v3-05-info--032',
    laborInfoDetail: 'sodam-v3-05-info--033',
    policyDetail: 'sodam-v3-05-info--034',
    taxInfoDetail: 'sodam-v3-05-info--035',
    tipsDetail: 'sodam-v3-05-info--036',
    qna: 'sodam-v3-05-info--037',
    qnaCompose: 'sodam-v3-05-info--073',
    legalWebview: 'sodam-v3-05-info--074',
    notificationCenter: 'sodam-v3-05-info--038',
    settingsHub: 'sodam-v3-06-settings--039',
    notificationSettings: 'sodam-v3-06-settings--040',
    myPage: 'sodam-v3-06-settings--041',
    accountSettings: 'sodam-v3-06-settings--042',
    profile: 'sodam-v3-06-settings--043',
    referral: 'sodam-v3-06-settings--044',
    logoutConfirm: 'sodam-v3-06-settings--075',
    accountDeleteFlow: 'sodam-v3-06-settings--076',
    imagePickerSheet: 'sodam-v3-06-settings--077',
    toastExamples: 'sodam-v3-06-settings--081',
    componentRules: 'sodam-v3-06-settings--082',
    recruitmentHub: 'sodam-v3-07-recruitment--R1',
    jobOfferInbox: 'sodam-v3-07-recruitment--R2',
    jobPostingDetail: 'sodam-v3-07-recruitment--R3',
    jobSeekerDetail: 'sodam-v3-07-recruitment--R4',
    jobSeekerList: 'sodam-v3-07-recruitment--R5',
    jobSeekingSettings: 'sodam-v3-07-recruitment--R6',
    nearbyJobPostings: 'sodam-v3-07-recruitment--R7',
    ourPosting: 'sodam-v3-07-recruitment--R8',
    contractSign: 'sodam-v3-08-contract--C1',
    draftContracts: 'sodam-v3-08-contract--C2',
    myContract: 'sodam-v3-08-contract--C3',
    sendContract: 'sodam-v3-08-contract--C4',
    addDocument: 'sodam-v3-08-contract--C5',
    employeeDocuments: 'sodam-v3-08-contract--C6',
    electronicSignProgress: 'sodam-v3-08-contract--C7',
    evidencePackage: 'sodam-v3-08-contract--C8',
    myCertificate: 'sodam-v3-08-contract--C9',
    minorGuard: 'sodam-v3-08-contract--C10',
    purchaseLedger: 'sodam-v3-10-business--B1',
    purchaseScan: 'sodam-v3-10-business--B2',
    purchaseConfirm: 'sodam-v3-10-business--B3',
    priceTrend: 'sodam-v3-10-business--B4',
    reorderHint: 'sodam-v3-10-business--B5',
    dailySalesEntry: 'sodam-v3-10-business--B6',
    laborCostRatio: 'sodam-v3-10-business--B7',
    weeklyInsights: 'sodam-v3-10-business--B8',
    subsidyEligibility: 'sodam-v3-10-business--B9',
    hiringCostSimulator: 'sodam-v3-10-business--B10',
    laborRiskDashboard: 'sodam-v3-10-business--B11',
    payrollPreview: 'sodam-v3-11-taxwage--W1',
    salaryArchive: 'sodam-v3-11-taxwage--W2',
    taxDeadline: 'sodam-v3-11-taxwage--W3',
    taxSimulator: 'sodam-v3-11-taxwage--W4',
    taxReport: 'sodam-v3-11-taxwage--W5',
    withholdingStatement: 'sodam-v3-11-taxwage--W6',
    myWageHistory: 'sodam-v3-11-taxwage--W7',
    headcountTrend: 'sodam-v3-11-taxwage--W8',
    legalLedger: 'sodam-v3-11-taxwage--W9',
    storeNoticeList: 'sodam-v3-12-notice--N1',
    writeNotice: 'sodam-v3-12-notice--N2',
    myNotice: 'sodam-v3-12-notice--N3',
    requestStatus: 'sodam-v3-12-notice--N4',
    managerAppoint: 'sodam-v3-12-notice--N5',
    employeeMyPage: 'sodam-v3-12-notice--N6',
    managerMyPage: 'sodam-v3-12-notice--N7',
    sendBonus: 'sodam-v3-12-notice--N8',
    personalAnnualTax: 'sodam-v3-12-notice--N9',
    breakRecord: 'sodam-v3-12-notice--N10',
    consent: 'sodam-v3-12-notice--N11',
    profileBasics: 'sodam-v3-12-notice--N12',
    commonEmpty: 'sodam-v3-06-settings--047',
    commonError: 'sodam-v3-06-settings--048',
    commonPermission: 'sodam-v3-06-settings--049',
    commonLoading: 'sodam-v3-06-settings--050',
    opsOperatingHours: 'sodam-v3-13-ops--O1',
    opsNfcTags: 'sodam-v3-13-ops--O2',
    opsEmployeeManagement: 'sodam-v3-13-ops--O3',
    opsBillingProcessing: 'sodam-v3-13-ops--O4',
    scheduleEditShift: 'sodam-v3-09-schedule--S1',
    scheduleMyShift: 'sodam-v3-09-schedule--S2',
    scheduleStoreSchedule: 'sodam-v3-09-schedule--S3',
    scheduleSwapBoard: 'sodam-v3-09-schedule--S4',
    scheduleSwapRequests: 'sodam-v3-09-schedule--S5',
    scheduleTimeOffApproval: 'sodam-v3-09-schedule--S6',
    scheduleLeaveBalance: 'sodam-v3-09-schedule--S7',
    scheduleAttendanceApproval: 'sodam-v3-09-schedule--S8',
    scheduleAttendanceIrregularities: 'sodam-v3-09-schedule--S9',
    scheduleAttendanceNotice: 'sodam-v3-09-schedule--S10',
    scheduleEmployeeWorkLog: 'sodam-v3-09-schedule--S11',
    ownerHome: 'sodam-v3-02-owner--008',
    ownerDashboardDetail: 'sodam-v3-02-owner--010',
    storeList: 'sodam-v3-02-owner--011',
    storeRegistration: 'sodam-v3-02-owner--012',
    storeDetail: 'sodam-v3-02-owner--013',
    storeEdit: 'sodam-v3-02-owner--014',
    workplaceList: 'sodam-v3-02-owner--015',
    workplaceDetail: 'sodam-v3-02-owner--016',
    employeeDetail: 'sodam-v3-02-owner--017',
    wageSettings: 'sodam-v3-02-owner--018',
    managerHome: 'sodam-v3-02-owner--046',
    masterMyPage: 'sodam-v3-02-owner--153',
    storeSwitcherSheet: 'sodam-v3-02-owner--052',
    addressSearchSheet: 'sodam-v3-02-owner--053',
    radiusSelectorSheet: 'sodam-v3-02-owner--054',
    inviteShareSheet: 'sodam-v3-02-owner--055',
    employeeActionSheet: 'sodam-v3-02-owner--056',
    wageEditSheet: 'sodam-v3-02-owner--057',
    opsAppUpdate: 'sodam-v3-13-ops--O5',
    opsMaintenance: 'sodam-v3-13-ops--O6',
    opsPaymentSuccess: 'sodam-v3-13-ops--O7',
    opsPushPrimer: 'sodam-v3-13-ops--O8',
    opsSubscriptionGate: 'sodam-v3-13-ops--O9',
} as const;

type CommonStateKind = 'empty' | 'error' | 'permission' | 'loading';

const COMMON_STATE_SPECS: Record<CommonStateKind, {
    header: string;
    headerAction?: string;
    glyph: string;
    title: string;
    description: string;
    primary?: string;
    secondary?: string;
    color: 'success' | 'error' | 'warning' | 'textSecondary';
    background: 'successBg' | 'errorBg' | 'warningBg' | 'surfaceMuted';
}> = {
    empty: {
        header: '직원', headerAction: '추가', glyph: '+',
        title: '아직 직원이 없어요',
        description: '초대 코드를 보내면 직원이 직접 가입하고 오늘부터 출퇴근을 찍을 수 있어요.',
        primary: '초대 코드 만들기', color: 'success', background: 'successBg',
    },
    error: {
        header: '연결 오류', headerAction: '재시도', glyph: '!',
        title: '잠시 연결이 불안정해요',
        description: '기록은 사라지지 않습니다. 네트워크가 복구되면 다시 불러올게요.',
        primary: '다시 시도', secondary: '고객지원 보기', color: 'error', background: 'errorBg',
    },
    permission: {
        header: '위치 권한', headerAction: '도움', glyph: '!',
        title: '위치 권한이 필요해요',
        description: '매장 근처에서 출근했는지 확인하기 위해 현재 위치를 한 번만 확인합니다.',
        primary: '권한 켜기', secondary: '사장님께 수동 요청', color: 'warning', background: 'warningBg',
    },
    loading: {
        header: '불러오는 중', glyph: '…',
        title: '매장 상태를 확인하고 있어요',
        description: '오늘 출근 기록과 급여 준비 상태를 정리하는 중입니다.',
        color: 'textSecondary', background: 'surfaceMuted',
    },
};

const StateProgress: React.FC = () => (
    <View style={styles.stateProgressCard}>
        <View style={styles.stateProgressTrack}>
            <View style={styles.stateProgressValue} />
        </View>
    </View>
);

const NativeReferenceCommonState: React.FC<{kind: CommonStateKind}> = ({kind}) => {
    const c = useThemeColors();
    const spec = COMMON_STATE_SPECS[kind];

    return (
        <ScreenContainer header={<AppHeader title={spec.header} rightText={spec.headerAction} />}>
            <View style={styles.stateCenter}>
                <View style={styles.stateInner}>
                    <View style={[styles.stateMark, {backgroundColor: c[spec.background]}]}>
                        <Text style={[styles.stateMarkText, {color: c[spec.color]}]}>{spec.glyph}</Text>
                    </View>
                    <Text style={[styles.stateTitle, {color: c.textPrimary}]}>{spec.title}</Text>
                    <Text style={[styles.stateCopy, {color: c.textSecondary}]}>{spec.description}</Text>
                    {kind === 'loading' ? <StateProgress /> : null}
                    {spec.primary ? <AppButton label={spec.primary} onPress={() => undefined} style={styles.stateCta} /> : null}
                    {spec.secondary ? <AppButton label={spec.secondary} variant="secondary" onPress={() => undefined} style={styles.stateCtaSub} /> : null}
                </View>
            </View>
        </ScreenContainer>
    );
};

const ActualCommonState: React.FC<{kind: CommonStateKind}> = ({kind}) => {
    const c = useThemeColors();
    const spec = COMMON_STATE_SPECS[kind];
    const glyph = <Text style={[styles.stateMarkText, {color: c[spec.color]}]}>{spec.glyph}</Text>;
    const commonProps = {
        title: spec.title,
        description: spec.description,
        glyph,
        markColor: c[spec.background],
        primary: spec.primary ? {label: spec.primary, onPress: () => undefined} : undefined,
        secondary: spec.secondary ? {label: spec.secondary, onPress: () => undefined} : undefined,
    };

    return (
        <ScreenContainer header={<AppHeader title={spec.header} rightText={spec.headerAction} />}>
            {kind === 'empty' ? <EmptyState {...commonProps} /> : null}
            {kind === 'error' ? <ErrorState {...commonProps} /> : null}
            {kind === 'permission' ? <PermissionState {...commonProps} /> : null}
            {kind === 'loading' ? <LoadingState title={spec.title} description={spec.description} glyph={glyph} markColor={c[spec.background]}><StateProgress /></LoadingState> : null}
        </ScreenContainer>
    );
};

type ServiceStateKind = 'update' | 'maintenance' | 'payment-success';

const NativeReferenceServiceState: React.FC<{kind: ServiceStateKind}> = ({kind}) => {
    const c = useThemeColors();
    const spec = kind === 'update'
        ? {
            title: '새 버전으로\n업데이트해 주세요',
            description: '안정적인 사용을 위해 최신 버전이 필요해요. 잠깐이면 끝나요.\n현재 버전 3.2.0',
            primary: '업데이트하기',
            mark: <Ionicons name="arrow-up-circle" size={40} color={c.brandPrimary} />,
            markColor: c.brandPrimarySoft,
        }
        : kind === 'maintenance'
            ? {
                title: '잠시 점검 중이에요',
                description: '더 안정적인 서비스를 위해 점검하고 있어요. 잠시 후 다시 시도해 주세요.',
                primary: '다시 시도',
                mark: <Ionicons name="construct-outline" size={40} color={c.warning} />,
                markColor: c.warningBg,
            }
            : {
                title: '결제가 완료됐어요',
                description: '비즈니스 플랜이 다시 활성화됐어요. 멈췄던 기능을 바로 쓸 수 있어요.',
                primary: '계속하기',
                mark: <Text style={[styles.stateMarkText, {color: c.textInverse}]}>✓</Text>,
                markColor: c.success,
            };

    return (
        <ScreenContainer edges={['top', 'bottom']}>
            <View style={styles.stateCenter}>
                <View style={styles.stateInner}>
                    <View style={[styles.stateMark, {backgroundColor: spec.markColor}]}>{spec.mark}</View>
                    <Text style={[styles.stateTitle, {color: c.textPrimary}]}>{spec.title}</Text>
                    <Text style={[styles.stateCopy, {color: c.textSecondary}]}>{spec.description}</Text>
                    <AppButton label={spec.primary} onPress={() => undefined} style={styles.stateCta} />
                </View>
            </View>
        </ScreenContainer>
    );
};

const REFERENCE_TIME_HELPER = '숫자만 입력하세요. 시간은 24시간 형식 4자리 숫자로 입력하세요. 예: 1020, 2330';

const OPERATING_HOURS_FIXTURE: StoreOperatingHoursVisualFixture = {
    rows: [
        {dayOfWeek: 'MONDAY', openTime: '0900', closeTime: '1800', isClosed: false},
        {dayOfWeek: 'TUESDAY', openTime: '0900', closeTime: '1800', isClosed: false},
        {dayOfWeek: 'WEDNESDAY', openTime: '0900', closeTime: '1800', isClosed: false},
        {dayOfWeek: 'THURSDAY', openTime: '0900', closeTime: '1800', isClosed: false},
        {dayOfWeek: 'FRIDAY', openTime: '0900', closeTime: '1800', isClosed: false},
        {dayOfWeek: 'SATURDAY', openTime: '0900', closeTime: '1800', isClosed: false},
        {dayOfWeek: 'SUNDAY', openTime: '0900', closeTime: '1800', isClosed: true},
    ],
};

const DAY_LABELS: Record<string, string> = {
    MONDAY: '월요일', TUESDAY: '화요일', WEDNESDAY: '수요일', THURSDAY: '목요일',
    FRIDAY: '금요일', SATURDAY: '토요일', SUNDAY: '일요일',
};

const NativeReferenceOperatingHours: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="운영시간 설정" onBack={() => undefined} />}
            footer={<CtaStack><AppButton label="운영시간 저장" onPress={() => undefined} /></CtaStack>}>
            <AppText variant="headingSm" style={styles.opsHoursTitle}>요일별 영업 시간을{'\n'}설정해 주세요</AppText>
            <AppText variant="bodyMd" tone="secondary" style={styles.opsHoursIntro}>
                출퇴근 인증과 이상 알림에 사용돼요.
            </AppText>
            <View style={styles.opsHoursList}>
                {OPERATING_HOURS_FIXTURE.rows.map(row => (
                    <AppCard key={row.dayOfWeek} variant="plain" style={styles.opsHoursDayCard}>
                        <View style={styles.opsHoursDayHeader}>
                            <AppText variant="titleMd">{DAY_LABELS[row.dayOfWeek]}</AppText>
                            <Pressable
                                onPress={() => undefined}
                                style={[
                                    styles.opsHoursClosedToggle,
                                    {backgroundColor: row.isClosed ? c.surfaceMuted : c.brandPrimarySoft},
                                ]}>
                                <Ionicons
                                    name={row.isClosed ? 'moon-outline' : 'storefront-outline'}
                                    size={14}
                                    color={row.isClosed ? c.textSecondary : c.brandPrimary}
                                />
                                <AppText variant="caption" weight="700" tone={row.isClosed ? 'secondary' : 'brand'}>
                                    {row.isClosed ? '휴무' : '영업'}
                                </AppText>
                            </Pressable>
                        </View>
                        {row.isClosed ? (
                            <AppText variant="caption" tone="tertiary" style={styles.opsHoursClosedHint}>
                                이 요일은 휴무로 설정됐어요.
                            </AppText>
                        ) : (
                            <View style={styles.opsHoursTimeRow}>
                                <AppInput
                                    label="오픈"
                                    value={row.openTime}
                                    onChangeText={() => undefined}
                                    placeholder="0900"
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    helper={REFERENCE_TIME_HELPER}
                                    containerStyle={styles.opsHoursTimeInput}
                                />
                                <AppInput
                                    label="마감"
                                    value={row.closeTime}
                                    onChangeText={() => undefined}
                                    placeholder="1800"
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    helper={REFERENCE_TIME_HELPER}
                                    containerStyle={styles.opsHoursTimeInput}
                                />
                            </View>
                        )}
                    </AppCard>
                ))}
            </View>
        </ScreenContainer>
    );
};

const NFC_TAGS_FIXTURE: NfcTagManagementVisualFixture = {
    tags: [
        {id: 1, storeId: 101, tagId: 'A3F291', label: '카운터 태그', active: true, createdAt: '2026-07-01T09:00:00Z'},
        {id: 2, storeId: 101, tagId: 'B7C042', label: '주방 태그', active: false, createdAt: '2026-07-01T09:00:00Z'},
    ],
};

const NativeReferenceNfcTags: React.FC = () => {
    return (
        <ScreenContainer scroll header={<AppHeader title="NFC 태그 관리" onBack={() => undefined} />}>
            <AppText variant="headingSm" style={styles.opsNfcSectionTitle}>새 태그 등록</AppText>
            <AppCard variant="flat" style={styles.opsNfcFormCard}>
                <AppInput label="태그 ID" placeholder="태그에 인쇄된 고유 ID" value="" onChangeText={() => undefined} autoCapitalize="none" autoCorrect={false} />
                <AppInput label="라벨 (선택)" placeholder="예: 카운터, 뒷문" value="" onChangeText={() => undefined} />
                <AppButton label="등록하기" onPress={() => undefined} style={styles.opsNfcRegisterButton} />
            </AppCard>
            <AppText variant="headingSm" style={styles.opsNfcSectionTitleGap}>등록된 태그 2개</AppText>
            <View style={styles.opsNfcList}>
                {NFC_TAGS_FIXTURE.tags.map(tag => (
                    <AppCard key={tag.id} variant="flat" style={styles.opsNfcTagCard}>
                        <View style={styles.opsNfcTagRow}>
                            <View style={styles.opsNfcFlex}>
                                <AppText variant="titleMd" weight="700" numberOfLines={1}>{tag.label}</AppText>
                                <AppText variant="caption" tone="secondary" numberOfLines={1}>ID {tag.tagId}</AppText>
                            </View>
                            <AppBadge label={tag.active ? '활성' : '비활성'} tone={tag.active ? 'success' : 'neutral'} />
                        </View>
                        <AppButton
                            label={tag.active ? '비활성화' : '재활성화'}
                            variant={tag.active ? 'destructive' : 'secondary'}
                            size="sm"
                            fullWidth={false}
                            style={styles.opsNfcToggleButton}
                            onPress={() => undefined}
                        />
                    </AppCard>
                ))}
            </View>
        </ScreenContainer>
    );
};

const EMPLOYEE_MANAGEMENT_FIXTURE: EmployeeManagementVisualFixture = {
    storeCode: 'SODAM5',
    employees: [
        {id: 1, name: '김민지', phone: '010-****-1234', userGrade: 'EMPLOYEE'},
        {id: 2, name: '이현수', phone: '010-****-5678', userGrade: 'MANAGER'},
        {id: 3, name: '박도윤', phone: '010-****-2468', userGrade: 'EMPLOYEE'},
        {id: 4, name: '최지아', phone: '010-****-1357', userGrade: 'EMPLOYEE'},
        {id: 5, name: '한서준', phone: '010-****-9876', userGrade: 'EMPLOYEE'},
    ],
};

const NativeReferenceEmployeeManagement: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="직원 관리" onBack={() => undefined} actions={[{label: '초대', onPress: () => undefined}]} />}
            footer={<CtaStack><AppButton label="직원 초대하기" onPress={() => undefined} /></CtaStack>}>
            <View style={styles.opsEmployeeSection}>
                <AppText variant="titleMd" tone="secondary" style={styles.opsEmployeeSectionTitle}>직원 5명</AppText>
                <View style={styles.opsEmployeeList}>
                    {EMPLOYEE_MANAGEMENT_FIXTURE.employees.map(employee => {
                        const isManager = employee.userGrade === 'ROLE_MANAGER' || employee.userGrade === 'MANAGER';
                        return (
                            <AppListItem
                                key={employee.id}
                                title={employee.name}
                                subtitle={employee.phone}
                                onPress={() => undefined}
                                right={
                                    <View style={styles.opsEmployeeRightRow}>
                                        <AppBadge label={isManager ? '매니저' : '직원'} tone={isManager ? 'success' : 'neutral'} />
                                        <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
                                    </View>
                                }
                                left={
                                    <View style={[styles.opsEmployeeAvatar, {backgroundColor: c.brandPrimarySoft}]}>
                                        <AppText variant="titleMd" tone="brand">{employee.name.slice(0, 1)}</AppText>
                                    </View>
                                }
                            />
                        );
                    })}
                </View>
            </View>
        </ScreenContainer>
    );
};

const NativeReferenceBillingProcessing: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer header={<AppHeader title="카드 등록" />}>
            <LoadingState
                title="결제 처리 중"
                description="결제를 처리하고 있어요…"
                glyph={<Text style={[styles.opsBillingGlyph, {color: c.textSecondary}]}>…</Text>}
                markColor={c.surfaceMuted}
            />
        </ScreenContainer>
    );
};

const EDIT_SHIFT_FIXTURE: EditShiftVisualFixture = {
    storeId: 101,
    employeeId: 1,
    employeeName: '김민지',
    shiftDate: '20260629',
    startTime: '1020',
    endTime: '2330',
    memo: '',
    items: [],
};

const NativeReferenceEditShift: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="근무 시프트" subtitle="김민지" onBack={() => undefined} />}
            footer={<AppButton label="근무 일정 등록" onPress={() => undefined} />}>
            <AppText variant="caption" tone="secondary" style={styles.scheduleFieldLabel}>근무 날짜</AppText>
            <AppInput value="20260629" onChangeText={() => undefined} placeholder="20260629" keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />
            <View style={styles.scheduleTimeRow}>
                <View style={styles.scheduleFlex}>
                    <AppText variant="caption" tone="secondary" style={styles.scheduleFieldLabel}>시작</AppText>
                    <AppInput value="1020" onChangeText={() => undefined} placeholder="1020" keyboardType="number-pad" maxLength={4} helper={TIME_DIGITS_HELPER} />
                </View>
                <View style={styles.scheduleFlex}>
                    <AppText variant="caption" tone="secondary" style={styles.scheduleFieldLabel}>종료</AppText>
                    <AppInput value="2330" onChangeText={() => undefined} placeholder="2330" keyboardType="number-pad" maxLength={4} helper={TIME_DIGITS_HELPER} />
                </View>
            </View>
            <AppText variant="caption" tone="secondary" style={styles.scheduleFieldLabel}>메모 (선택)</AppText>
            <AppInput value="" onChangeText={() => undefined} placeholder="예: 오픈 / 마감 / 홀" />
            <AppText variant="titleMd" style={styles.scheduleListTitle}>이번 주 등록된 일정</AppText>
            <EmptyState
                glyph={<Ionicons name="calendar-outline" size={36} color={c.textTertiary} />}
                markColor={c.surfaceMuted}
                title="이번 주 등록된 일정이 없어요"
                description="위에서 근무 날짜와 시간을 입력해 등록해 주세요."
            />
        </ScreenContainer>
    );
};

const MY_SHIFT_FIXTURE: MyShiftVisualFixture = {
    month: '2026-07',
    selectedDate: '2026-07-20',
    shifts: [
        {id: 1, employeeId: 1, storeId: 101, shiftDate: '2026-07-01', startTime: '10:00', endTime: '18:00', memo: '오픈'},
        {id: 2, employeeId: 1, storeId: 101, shiftDate: '2026-07-03', startTime: '10:00', endTime: '18:00'},
        {id: 3, employeeId: 1, storeId: 101, shiftDate: '2026-07-05', startTime: '10:00', endTime: '18:00'},
        {id: 4, employeeId: 1, storeId: 101, shiftDate: '2026-07-07', startTime: '10:00', endTime: '18:00'},
        {id: 5, employeeId: 1, storeId: 101, shiftDate: '2026-07-09', startTime: '10:00', endTime: '18:00'},
        {id: 6, employeeId: 1, storeId: 101, shiftDate: '2026-07-11', startTime: '10:00', endTime: '18:00'},
        {id: 7, employeeId: 1, storeId: 101, shiftDate: '2026-07-13', startTime: '10:00', endTime: '18:00'},
        {id: 8, employeeId: 1, storeId: 101, shiftDate: '2026-07-15', startTime: '10:00', endTime: '18:00'},
        {id: 9, employeeId: 1, storeId: 101, shiftDate: '2026-07-17', startTime: '10:00', endTime: '18:00'},
        {id: 10, employeeId: 1, storeId: 101, shiftDate: '2026-07-19', startTime: '10:00', endTime: '18:00'},
        {id: 11, employeeId: 1, storeId: 101, shiftDate: '2026-07-20', startTime: '10:00', endTime: '18:00', memo: '오픈'},
        {id: 12, employeeId: 1, storeId: 101, shiftDate: '2026-07-21', startTime: '10:00', endTime: '18:00'},
    ],
};

const SCHEDULE_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatFixtureShiftDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    const weekday = SCHEDULE_WEEKDAYS[new Date(year, month - 1, day).getDay()];
    return `${month}월 ${day}일 (${weekday})`;
}

const NativeReferenceMyShift: React.FC = () => {
    const c = useThemeColors();
    const marks: Record<string, {dots: string[]}> = {};
    MY_SHIFT_FIXTURE.shifts.forEach(shift => {
        marks[shift.shiftDate] = {dots: [c.brandPrimary]};
    });
    const selectedShift = MY_SHIFT_FIXTURE.shifts.find(shift => shift.shiftDate === MY_SHIFT_FIXTURE.selectedDate);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="내 근무 일정" onBack={() => undefined} />}
            footer={<RoleTabBar active="schedule" />}>
            <View style={styles.myShiftContainer}>
                <View style={[styles.myShiftSummaryBar, {backgroundColor: c.surfaceMuted}]}>
                    <View style={styles.myShiftSummaryItem}>
                        <AppText variant="caption" tone="secondary">이번 달 근무</AppText>
                        <AppText variant="titleMd" weight="700">12건</AppText>
                    </View>
                    <View style={[styles.myShiftDivider, {backgroundColor: c.border}]} />
                    <View style={styles.myShiftSummaryItem}>
                        <AppText variant="caption" tone="secondary">총 근무 시간</AppText>
                        <AppText variant="titleMd" weight="700">96.0h</AppText>
                    </View>
                </View>
                <AppCalendar
                    month="2026-07"
                    onMonthChange={() => undefined}
                    markedDates={marks}
                    selectedDate="2026-07-20"
                    onDayPress={() => undefined}
                />
                <View style={styles.myShiftDaySection}>
                    <View style={styles.myShiftDaySectionHeader}>
                        <Ionicons name="calendar-outline" size={16} color={c.brandPrimary} />
                        <AppText variant="titleMd" weight="700">7월 20일 (월)</AppText>
                    </View>
                    {selectedShift ? (
                        <AppCard variant="flat" style={styles.myShiftCard}>
                            <View style={styles.myShiftRow}>
                                <View style={[styles.myShiftIconWrap, {backgroundColor: c.brandPrimarySoft}]}>
                                    <Ionicons name="time-outline" size={20} color={c.brandPrimary} />
                                </View>
                                <View style={styles.myShiftFlex}>
                                    <AppText variant="titleMd">10:00 ~ 18:00</AppText>
                                    <AppText variant="caption" tone="secondary">8.0시간 근무 · 오픈</AppText>
                                </View>
                            </View>
                        </AppCard>
                    ) : null}
                </View>
                <View style={styles.myShiftMonthList}>
                    <AppText variant="caption" tone="secondary" style={styles.myShiftSectionTitle}>2026년 07월 전체 근무</AppText>
                    {MY_SHIFT_FIXTURE.shifts.map(shift => (
                        <AppCard key={shift.id} variant="flat" style={styles.myShiftListCard}>
                            <View style={styles.myShiftRow}>
                                <View style={[styles.myShiftIconWrap, {backgroundColor: c.surfaceMuted}]}>
                                    <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
                                </View>
                                <View style={styles.myShiftFlex}>
                                    <AppText variant="titleMd">{formatFixtureShiftDate(shift.shiftDate)}</AppText>
                                    <AppText variant="caption" tone="secondary">
                                        {shift.startTime} ~ {shift.endTime}{shift.memo ? ` · ${shift.memo}` : ''}
                                    </AppText>
                                </View>
                            </View>
                        </AppCard>
                    ))}
                </View>
            </View>
        </ScreenContainer>
    );
};

const ATTENDANCE_APPROVAL_FIXTURE: AttendanceApprovalVisualFixture = {
    items: [{
        id: 1,
        employeeId: 1,
        employeeName: '김민지',
        storeId: 101,
        type: 'CHECK_IN',
        requestedTime: '2026-07-20T09:58:00',
        status: 'PENDING',
        requestedAt: '2026-07-20T09:58:00',
    }],
};

const NativeReferenceAttendanceApproval: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer scroll header={<AppHeader title="출근 승인" onBack={() => undefined} />}>
            <AppCard variant="flat" style={styles.scheduleApprovalIntro}>
                <AppText variant="titleMd" weight="800">대기 중인 출퇴근 요청</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.scheduleApprovalIntroBody}>
                    승인하면 직원이 요청한 시각으로 출퇴근이 기록돼요.
                </AppText>
            </AppCard>
            <View style={styles.scheduleApprovalList}>
                <AppCard variant="flat" style={styles.scheduleApprovalCard}>
                    <View style={styles.scheduleApprovalCardHead}>
                        <View style={[styles.scheduleApprovalIcon, {backgroundColor: c.brandPrimarySoft}]}>
                            <Ionicons name="log-in-outline" size={20} color={c.brandPrimary} />
                        </View>
                        <View style={styles.scheduleApprovalFlex}>
                            <AppText variant="titleMd" numberOfLines={1}>김민지님 출근 요청</AppText>
                            <AppText variant="caption" tone="secondary">요청 시각 7/20 09:58</AppText>
                        </View>
                    </View>
                    <View style={styles.scheduleApprovalActions}>
                        <AppButton label="거절" variant="secondary" fullWidth={false} style={styles.scheduleApprovalFlex} onPress={() => undefined} />
                        <AppButton
                            label="승인"
                            fullWidth={false}
                            style={styles.scheduleApprovalFlex}
                            leftIcon={<Ionicons name="checkmark-outline" size={18} color={c.textInverse} />}
                            onPress={() => undefined}
                        />
                    </View>
                </AppCard>
            </View>
        </ScreenContainer>
    );
};

const TIME_OFF_APPROVAL_FIXTURE: TimeOffApprovalVisualFixture = {
    items: [{
        id: 1,
        employeeId: 1,
        employeeName: '김민지',
        storeId: 101,
        leaveType: 'ANNUAL',
        unit: 'FULL_DAY',
        startDate: '2026-07-20',
        endDate: '2026-07-20',
        startTime: null,
        endTime: null,
        consumedDays: 1,
        reason: '가족 행사에 참석해야 해요.',
        rejectReason: null,
        status: 'PENDING',
    }],
};

const NativeReferenceTimeOffApproval: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer scroll header={<AppHeader title="휴가 승인" onBack={() => undefined} />}>
            <AppCard variant="flat" style={styles.scheduleApprovalIntro}>
                <AppText variant="titleMd" weight="800">대기 중인 휴가 신청</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.scheduleApprovalIntroBody}>
                    승인하면 연차인 경우 잔여 연차에서 자동으로 차감돼요.
                </AppText>
            </AppCard>
            <View style={styles.scheduleApprovalList}>
                <AppCard variant="flat" style={styles.scheduleApprovalCard}>
                    <View style={styles.scheduleApprovalCardHead}>
                        <View style={[styles.scheduleApprovalIcon, {backgroundColor: c.surfaceMint}]}>
                            <Ionicons name="umbrella-outline" size={20} color={c.success} />
                        </View>
                        <View style={styles.scheduleApprovalFlex}>
                            <AppText variant="titleMd" numberOfLines={1}>김민지님 연차 신청</AppText>
                            <AppText variant="caption" tone="secondary">07/20 · 종일 · 1일</AppText>
                        </View>
                        <AppBadge label="대기" tone="warning" />
                    </View>
                    <AppText variant="bodyMd" tone="secondary" numberOfLines={3}>가족 행사에 참석해야 해요.</AppText>
                    <View style={styles.scheduleApprovalActions}>
                        <AppButton label="거부" variant="secondary" fullWidth={false} style={styles.scheduleApprovalFlex} onPress={() => undefined} />
                        <AppButton
                            label="승인"
                            fullWidth={false}
                            style={styles.scheduleApprovalFlex}
                            leftIcon={<Ionicons name="checkmark-outline" size={18} color={c.textInverse} />}
                            onPress={() => undefined}
                        />
                    </View>
                </AppCard>
            </View>
        </ScreenContainer>
    );
};

const ATTENDANCE_IRREGULARITIES_FIXTURE: AttendanceIrregularitiesVisualFixture = {
    storeId: 101,
    range: {from: '2026-07-05', to: '2026-07-18'},
    items: [{
        id: 1,
        employeeId: 1,
        employeeName: '김민지',
        storeId: 101,
        shiftDate: '2026-07-18',
        type: 'LATE',
        minutesShort: 12,
        resolution: 'PENDING',
        deductedAmount: null,
        note: null,
        resolvedAt: null,
    }],
};

const NativeReferenceAttendanceIrregularities: React.FC = () => (
    <ScreenContainer scroll header={<AppHeader title="지각/조퇴/결근" onBack={() => undefined} />}>
        <AppCard variant="flat" style={styles.scheduleApprovalIntro}>
            <AppText variant="bodyMd" tone="secondary">
                최근 14일간 스케줄 대비 지각/조퇴/결근이 자동으로 감지돼요. 공제는 이미 이번 정산에 반영되어 있어요.
                사유가 있으면 공제 없이 처리하거나 연차로 대체할 수 있어요.
            </AppText>
        </AppCard>
        <View style={styles.scheduleApprovalList}>
            <AppCard variant="flat" style={styles.scheduleApprovalCard}>
                <View style={styles.scheduleApprovalCardHead}>
                    <View style={styles.scheduleApprovalFlex}>
                        <AppText variant="titleMd">김민지 · 지각</AppText>
                        <AppText variant="caption" tone="secondary">7/18 · 12분</AppText>
                    </View>
                    <AppBadge label="미확정" tone="warning" />
                </View>
                <View style={styles.scheduleApprovalActions}>
                    <AppButton label="공제 없음" variant="secondary" fullWidth={false} style={styles.scheduleApprovalFlex} onPress={() => undefined} />
                    <AppButton label="연차 전환" variant="secondary" fullWidth={false} style={styles.scheduleApprovalFlex} onPress={() => undefined} />
                    <AppButton label="공제 확정" fullWidth={false} style={styles.scheduleApprovalFlex} onPress={() => undefined} />
                </View>
            </AppCard>
        </View>
    </ScreenContainer>
);

const SWAP_BOARD_FIXTURE: SwapBoardVisualFixture = {
    stores: [{id: 101, storeName: '소담 카페 성수점'}],
    selectedStoreId: 101,
    currentEmployeeId: 1,
    swaps: [{
        id: 1,
        shiftId: 1,
        shiftDate: '2026-07-23',
        startTime: '12:00:00',
        endTime: '18:00:00',
        status: 'OPEN',
        originalEmployeeName: '도윤',
        applicants: [],
    }],
};

const NativeReferenceSwapBoard: React.FC = () => (
    <ScreenContainer header={<AppHeader title="대타 지원" onBack={() => undefined} />} padded={false}>
        <ScrollView contentContainerStyle={styles.scheduleSwapScroll} showsVerticalScrollIndicator={false}>
            <StorePassRow
                items={[{id: 101, name: '소담 카페 성수점'}]}
                selectedId={101}
                onSelect={() => undefined}
                style={styles.scheduleSwapPassRow}
            />
            <AppCard style={styles.scheduleSwapCard}>
                <View style={styles.scheduleSwapCardTop}>
                    <View style={styles.scheduleSwapCardInfo}>
                        <AppText variant="headingSm">7월 23일 (목)</AppText>
                        <AppText variant="bodyMd" tone="secondary" style={styles.scheduleSwapTime}>12:00 ~ 18:00</AppText>
                        <AppText variant="caption" tone="tertiary" style={styles.scheduleSwapOwner}>도윤 님의 근무</AppText>
                    </View>
                </View>
                <AppButton label="지원하기" size="md" onPress={() => undefined} style={styles.scheduleSwapApply} />
            </AppCard>
        </ScrollView>
    </ScreenContainer>
);

const STORE_SCHEDULE_FIXTURE: StoreScheduleVisualFixture = {
    storeId: 101,
    tab: 'board',
    calMonth: '2026-07',
    selectedDate: '2026-07-06',
    boardWeekStart: '2026-07-02',
    employees: [
        {id: 1, name: '김민지'}, {id: 2, name: '박도담'}, {id: 3, name: '이현수'},
        {id: 4, name: '최하늘'}, {id: 5, name: '윤서연'}, {id: 6, name: '정우진'},
        {id: 7, name: '한유진'}, {id: 8, name: '오지훈'}, {id: 9, name: '문채원'},
    ],
    shifts: [
        {id: 1, employeeId: 1, storeId: 101, shiftDate: '2026-07-02', startTime: '09:00:00', endTime: '16:30:00', memo: '오픈'},
        {id: 2, employeeId: 2, storeId: 101, shiftDate: '2026-07-02', startTime: '16:30:00', endTime: '00:00:00', memo: '마감'},
        {id: 3, employeeId: 3, storeId: 101, shiftDate: '2026-07-03', startTime: '09:00:00', endTime: '16:30:00', memo: '오픈'},
        {id: 4, employeeId: 4, storeId: 101, shiftDate: '2026-07-03', startTime: '16:30:00', endTime: '00:00:00', memo: '마감'},
        {id: 5, employeeId: 5, storeId: 101, shiftDate: '2026-07-04', startTime: '10:00:00', endTime: '18:00:00', memo: '주말'},
        {id: 6, employeeId: 6, storeId: 101, shiftDate: '2026-07-05', startTime: '10:00:00', endTime: '18:00:00', memo: '주말'},
        {id: 7, employeeId: 7, storeId: 101, shiftDate: '2026-07-06', startTime: '12:00:00', endTime: '17:30:00', memo: '피크'},
        {id: 8, employeeId: 8, storeId: 101, shiftDate: '2026-07-07', startTime: '12:00:00', endTime: '17:30:00', memo: '피크'},
        {id: 9, employeeId: 9, storeId: 101, shiftDate: '2026-07-08', startTime: '12:00:00', endTime: '17:30:00', memo: '피크'},
    ],
    operatingHours: [],
    templates: [],
};

const NativeReferenceSchedulePill: React.FC<{value: string}> = ({value}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.scheduleStoreSummaryPill, {backgroundColor: c.background}]}>
            <AppText variant="caption" weight="700" tone="secondary">{value}</AppText>
        </View>
    );
};

const NativeReferenceScheduleBoardRow: React.FC<{weekday: string; date: string; shifts: Array<{name: string; time: string}>}> = ({weekday, date, shifts}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.scheduleStoreBoardRow, {borderColor: c.border}]}> 
            <View style={styles.scheduleStoreBoardHeader}>
                <AppText variant="caption" tone="secondary">{weekday}</AppText>
                <AppText variant="titleMd">{date}</AppText>
                <Pressable hitSlop={8} onPress={() => undefined} accessibilityRole="button" accessibilityLabel={`${date} 근무 추가`} style={[styles.scheduleStoreBoardAdd, {backgroundColor: c.surfaceMuted}]}> 
                    <Ionicons name="add" size={14} color={c.brandPrimary} />
                </Pressable>
            </View>
            <View style={styles.scheduleStoreBoardBody}>
                {shifts.map(shift => (
                    <View key={`${date}-${shift.name}`} style={[styles.scheduleStoreBoardChip, {backgroundColor: c.surfaceSky, borderColor: c.border}]}> 
                        <Ionicons name="time-outline" size={13} color={c.info} />
                        <View style={styles.scheduleStoreBoardChipText}>
                            <AppText variant="caption" numberOfLines={1}>{shift.name}</AppText>
                            <AppText variant="caption" tone="secondary" numberOfLines={1}>{shift.time}</AppText>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const NativeReferenceStoreSchedule: React.FC = () => {
    const c = useThemeColors();
    const tabs: Array<{id: 'calendar' | 'board' | 'template'; label: string; icon: React.ComponentProps<typeof Ionicons>['name']}> = [
        {id: 'calendar', label: '캘린더', icon: 'calendar-outline'},
        {id: 'board', label: '보드', icon: 'grid-outline'},
        {id: 'template', label: '템플릿', icon: 'documents-outline'},
    ];
    return (
        <ScreenContainer scroll header={<AppHeader title="스케줄 관리" onBack={() => undefined} />}>
            <View style={styles.scheduleStoreTabBar}>
                {tabs.map(tab => {
                    const active = tab.id === 'board';
                    return (
                        <Pressable
                            key={tab.id}
                            onPress={() => undefined}
                            style={[styles.scheduleStoreTabButton, {backgroundColor: active ? c.brandPrimary : c.background, borderColor: active ? c.brandPrimary : c.border}]}> 
                            <Ionicons name={tab.icon} size={16} color={active ? c.textInverse : c.textTertiary} />
                            <AppText variant="caption" weight={active ? '700' : '400'} style={{color: active ? c.textInverse : c.textTertiary}}>{tab.label}</AppText>
                        </Pressable>
                    );
                })}
            </View>
            <View style={styles.scheduleStoreSection}>
                <View style={[styles.scheduleStoreWeekHeader, {backgroundColor: c.surfaceMuted}]}> 
                    <Pressable hitSlop={12} onPress={() => undefined} accessibilityRole="button" accessibilityLabel="이전 주">
                        <Ionicons name="chevron-back-outline" size={22} color={c.textPrimary} />
                    </Pressable>
                    <View style={styles.scheduleStoreWeekHeaderCenter}>
                        <AppText variant="caption" tone="secondary">7/2 (목) ~ 7/8 (수)</AppText>
                        <View style={styles.scheduleStoreSummaryPills}>
                            <NativeReferenceSchedulePill value="9건" />
                            <NativeReferenceSchedulePill value="9명" />
                            <NativeReferenceSchedulePill value="62.5h" />
                        </View>
                    </View>
                    <Pressable hitSlop={12} onPress={() => undefined} accessibilityRole="button" accessibilityLabel="다음 주">
                        <Ionicons name="chevron-forward-outline" size={22} color={c.textPrimary} />
                    </Pressable>
                </View>
                <View style={styles.scheduleStoreActionRow}>
                    <AppButton label="지난주 복사" variant="secondary" size="md" fullWidth={false} style={styles.scheduleApprovalFlex} onPress={() => undefined} />
                    <AppButton label="확정·알림" size="md" fullWidth={false} style={styles.scheduleApprovalFlex} onPress={() => undefined} />
                </View>
                <View style={styles.scheduleStoreHintRow}>
                    <Ionicons name="hand-left-outline" size={13} color={c.textTertiary} />
                    <AppText variant="caption" tone="tertiary">근무를 길게 눌러 끌면 요일 이동 · 탭하면 수정 · "+" 탭하면 추가</AppText>
                </View>
                <View style={styles.scheduleStoreBoard}>
                    <NativeReferenceScheduleBoardRow weekday="목" date="7/2" shifts={[{name: '김민지', time: '09:00~16:30'}, {name: '박도담', time: '16:30~00:00 익일'}]} />
                    <NativeReferenceScheduleBoardRow weekday="금" date="7/3" shifts={[{name: '이현수', time: '09:00~16:30'}, {name: '최하늘', time: '16:30~00:00 익일'}]} />
                    <NativeReferenceScheduleBoardRow weekday="토" date="7/4" shifts={[{name: '윤서연', time: '10:00~18:00'}]} />
                    <NativeReferenceScheduleBoardRow weekday="일" date="7/5" shifts={[{name: '정우진', time: '10:00~18:00'}]} />
                    <NativeReferenceScheduleBoardRow weekday="월" date="7/6" shifts={[{name: '한유진', time: '12:00~17:30'}]} />
                    <NativeReferenceScheduleBoardRow weekday="화" date="7/7" shifts={[{name: '오지훈', time: '12:00~17:30'}]} />
                    <NativeReferenceScheduleBoardRow weekday="수" date="7/8" shifts={[{name: '문채원', time: '12:00~17:30'}]} />
                </View>
            </View>
        </ScreenContainer>
    );
};

const EMPLOYEE_WORK_LOG_FIXTURE: EmployeeWorkLogVisualFixture = {
    year: 2026,
    month: 7,
    stores: [{id: 101, storeName: '굿모닝분식', appliedHourlyWage: 13125}],
    selectedStoreId: 101,
    workLog: {
        employeeId: 1,
        storeId: 101,
        storeName: '굿모닝분식',
        year: 2026,
        month: 7,
        summary: {
            attendanceDays: 14,
            totalWorkedMinutes: 6720,
            totalDailyWage: 1470000,
            totalBonusAmount: 50000,
            totalGrossWage: 1520000,
        },
        rows: [
            {
                attendanceId: 1,
                date: '2026-07-20',
                checkInTime: '2026-07-20T09:58:00',
                checkOutTime: '2026-07-20T18:03:00',
                workedMinutes: 485,
                dailyWage: 105000,
                bonusAmount: 0,
                memo: '정상',
                status: 'CONFIRMED',
            },
            {
                date: '2026-07-19',
                workedMinutes: 0,
                dailyWage: 0,
                bonusAmount: 50000,
                bonusReason: '격려 보너스',
                status: 'BONUS_ONLY',
            },
        ],
    },
};

const NativeWorkLogCell: React.FC<{width: number; children: React.ReactNode; strong?: boolean; header?: boolean; align?: 'left' | 'right'}> = ({width, children, strong, header, align = 'left'}) => {
    const emphasized = strong === true || header === true;
    return (
        <View style={[styles.scheduleWorkLogCell, {width}]}> 
            <AppText variant="caption" weight={emphasized ? '800' : '600'} tone={header ? 'secondary' : 'primary'} style={{textAlign: align}} numberOfLines={1}>
                {children}
            </AppText>
        </View>
    );
};

const NativeWorkLogMetric: React.FC<{label: string; value: string; tone?: 'brand' | 'info' | 'warning'}> = ({label, value, tone}) => {
    const c = useThemeColors();
    const backgroundColor = tone === 'brand' ? c.brandPrimarySoft : tone === 'info' ? c.infoBg : tone === 'warning' ? c.warningBg : c.surface;
    const color = tone === 'brand' ? c.brandPrimary : tone === 'info' ? c.info : tone === 'warning' ? c.warning : c.textPrimary;
    return (
        <View style={[styles.scheduleWorkLogMetric, {backgroundColor, borderColor: c.border}]}> 
            <AppText variant="caption" tone="secondary" numberOfLines={1}>{label}</AppText>
            <AppText variant="titleMd" weight="800" style={{color}} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
        </View>
    );
};

const NativeReferenceEmployeeWorkLog: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer
            scroll
            padded={false}
            header={<AppHeader title="근무일지" subtitle="굿모닝분식" onBack={() => undefined} />}>
            <View style={styles.scheduleWorkLogBody}>
                <View style={[styles.scheduleWorkLogMonthBar, {backgroundColor: c.surface, borderColor: c.border}]}> 
                    <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={() => undefined} hitSlop={10} style={[styles.scheduleWorkLogMonthButton, {backgroundColor: c.surfaceMuted}]}> 
                        <Ionicons name="chevron-back" size={22} color={c.brandPrimary} />
                    </Pressable>
                    <View style={styles.scheduleWorkLogMonthTitle}>
                        <AppText variant="headingMd" weight="800" center>2026년 7월</AppText>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={() => undefined} hitSlop={10} style={[styles.scheduleWorkLogMonthButton, {backgroundColor: c.surfaceMuted}]}> 
                        <Ionicons name="chevron-forward" size={22} color={c.brandPrimary} />
                    </Pressable>
                </View>
                <View style={styles.scheduleWorkLogSummaryGrid}>
                    <NativeWorkLogMetric label="출근일수" value="14일" tone="brand" />
                    <NativeWorkLogMetric label="총근무시간" value="112h" tone="info" />
                    <NativeWorkLogMetric label="일급여(세전)" value="1,470,000원" />
                    <NativeWorkLogMetric label="보너스+기타" value="50,000원" tone="warning" />
                </View>
                <AppCard variant="plain" style={styles.scheduleWorkLogTotalCard}>
                    <View style={styles.scheduleWorkLogTotalRow}>
                        <View>
                            <AppText variant="caption" tone="secondary">월 세전 합계</AppText>
                            <AppText variant="headingMd" weight="800">1,520,000원</AppText>
                        </View>
                        <View style={[styles.scheduleWorkLogStatusChip, {backgroundColor: c.successBg}]}> 
                            <AppText variant="caption" weight="800" style={{color: c.success}}>2건</AppText>
                        </View>
                    </View>
                </AppCard>
                <AppCard variant="plain" style={styles.scheduleWorkLogTableCard}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                            <View style={[styles.scheduleWorkLogTableRow, styles.scheduleWorkLogHeaderRow]}>
                                <NativeWorkLogCell width={92} header>일자</NativeWorkLogCell>
                                <NativeWorkLogCell width={84} header>출근시간</NativeWorkLogCell>
                                <NativeWorkLogCell width={84} header>퇴근시간</NativeWorkLogCell>
                                <NativeWorkLogCell width={104} header>총근무시간</NativeWorkLogCell>
                                <NativeWorkLogCell width={120} header align="right">일급여(세전)</NativeWorkLogCell>
                            </View>
                            <View style={[styles.scheduleWorkLogTableRow, {borderColor: c.divider}]}> 
                                <NativeWorkLogCell width={92} strong>07.20 월</NativeWorkLogCell>
                                <NativeWorkLogCell width={84}>09:58</NativeWorkLogCell>
                                <NativeWorkLogCell width={84}>18:03</NativeWorkLogCell>
                                <NativeWorkLogCell width={104}>8h 5m</NativeWorkLogCell>
                                <NativeWorkLogCell width={120} align="right">105,000원</NativeWorkLogCell>
                            </View>
                            <View style={[styles.scheduleWorkLogTableRow, {borderColor: c.divider}]}> 
                                <NativeWorkLogCell width={92} strong>07.19 일</NativeWorkLogCell>
                                <NativeWorkLogCell width={84}>-</NativeWorkLogCell>
                                <NativeWorkLogCell width={84}>-</NativeWorkLogCell>
                                <NativeWorkLogCell width={104}>-</NativeWorkLogCell>
                                <NativeWorkLogCell width={120} align="right">-</NativeWorkLogCell>
                            </View>
                        </View>
                    </ScrollView>
                </AppCard>
            </View>
        </ScreenContainer>
    );
};

const SWAP_REQUESTS_FIXTURE: SwapRequestsVisualFixture = {
    storeId: 101,
    employeeNames: {1: '김민지', 2: '도윤'},
    shifts: [{
        id: 2,
        employeeId: 1,
        storeId: 101,
        shiftDate: '2026-07-22',
        startTime: '10:00:00',
        endTime: '16:00:00',
        memo: '오픈',
    }],
    requests: [{
        id: 1,
        shiftId: 1,
        shiftDate: '2026-07-23',
        startTime: '12:00:00',
        endTime: '18:00:00',
        status: 'OPEN',
        originalEmployeeName: '도윤',
        applicants: [{employeeId: 1, employeeName: '김민지', appliedAt: '2026-07-20T09:00:00'}],
    }],
};

const NativeReferenceSwapRequests: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer scroll header={<AppHeader title="대타 구하기" onBack={() => undefined} />}>
            <AppText variant="headingSm" style={styles.scheduleRequestsTitle}>대타 모집 열기</AppText>
            <AppText variant="caption" tone="tertiary" style={styles.scheduleRequestsHint}>
                오늘부터 7일 안의 근무 중 대타가 필요한 근무를 선택하세요.
            </AppText>
            <View style={styles.scheduleRequestsList}>
                <View style={[styles.scheduleRequestsCandidate, {backgroundColor: c.surface, borderColor: c.border}]}>
                    <Ionicons name="radio-button-off" size={18} color={c.textTertiary} />
                    <View style={styles.scheduleApprovalFlex}>
                        <AppText variant="titleMd" weight="600">7월 22일 (수) · 10:00~16:00</AppText>
                        <AppText variant="caption" tone="secondary">김민지 · 오픈</AppText>
                    </View>
                </View>
            </View>
            <AppButton label="대타 모집 시작" disabled style={styles.scheduleRequestsStart} onPress={() => undefined} />

            <AppText variant="headingSm" style={styles.scheduleRequestsTitleGap}>모집 중</AppText>
            <View style={styles.scheduleRequestsList}>
                <AppCard variant="flat">
                    <View style={styles.scheduleRequestsRequestTop}>
                        <View style={styles.scheduleApprovalFlex}>
                            <AppText variant="titleMd" weight="700">7월 23일 (목) · 12:00~18:00</AppText>
                            <AppText variant="caption" tone="secondary">원 배정: 도윤 · 지원자 1명</AppText>
                        </View>
                        <AppBadge label="지원 1" tone="warning" />
                        <Ionicons name="chevron-down" size={16} color={c.textTertiary} />
                    </View>
                </AppCard>
            </View>
        </ScreenContainer>
    );
};

const ATTENDANCE_NOTICE_FIXTURE: AttendanceNoticeVisualFixture = {
    storeId: 101,
    typeIdx: 0,
    forDate: '20260620',
    message: '',
};

const NativeReferenceAttendanceNotice: React.FC = () => (
    <ScreenContainer
        scroll
        header={<AppHeader title="지각/조퇴/결근 알리기" onBack={() => undefined} />}
        footer={<CtaStack><AppButton label="사장님께 알리기" onPress={() => undefined} /></CtaStack>}>
        <AppCard variant="spot" style={styles.scheduleNoticeHero}>
            <AppText variant="headingMd">미리 알려주세요</AppText>
            <AppText variant="bodyMd" tone="secondary" style={styles.scheduleNoticeSub}>
                이 신고는 사장님께 알림만 가고 임금에는 영향을 주지 않아요. 실제 공제/연차 전환 여부는
                사장님이 나중에 확인해 처리해요.
            </AppText>
        </AppCard>
        <View style={styles.scheduleNoticeForm}>
            <View>
                <AppText variant="caption" tone="secondary" style={styles.scheduleNoticeFieldLabel}>유형</AppText>
                <SegmentedControl options={['지각', '조퇴', '결근']} value={0} onChange={() => undefined} />
            </View>
            <AppInput
                label="날짜"
                placeholder="20260601"
                value="20260620"
                onChangeText={() => undefined}
                keyboardType="number-pad"
                maxLength={8}
                helper={DATE_DIGITS_HELPER}
            />
            <AppInput
                label="메시지(선택)"
                placeholder="예: 차가 막혀서 15분 정도 늦을 것 같아요"
                value=""
                onChangeText={() => undefined}
                multiline
                maxLength={300}
                helper="0 / 300자"
            />
        </View>
    </ScreenContainer>
);

const LEAVE_BALANCE_FIXTURE: MyLeaveBalanceVisualFixture = {
    data: {
        entitledDays: 11,
        usedDays: 5,
        remainingDays: 6,
        fiveOrMoreApplicable: true,
        disclaimer: '참고용 추정이에요. 실제와 다를 수 있어요.',
    },
};

const NativeReferenceLeaveBalance: React.FC = () => {
    const c = useThemeColors();
    const usedRatio = 5 / 11;
    const remainingRatio = 1 - usedRatio;
    return (
        <ScreenContainer scroll header={<AppHeader title="내 연차" onBack={() => undefined} />}>
            <AppCard variant="spot" style={styles.scheduleLeaveSpotCard}>
                <HeroNumber label="잔여 연차" value="6일" sub="발생 11일 중 5일 사용" accent />
                <View style={[styles.scheduleLeaveTrack, {backgroundColor: c.surfaceMuted}]}>
                    <View style={[styles.scheduleLeaveFill, {backgroundColor: c.brandPrimary, width: `${usedRatio * 100}%`}]} />
                    <View style={[styles.scheduleLeaveFill, {backgroundColor: c.success, width: `${remainingRatio * 100}%`}]} />
                </View>
                <View style={styles.scheduleLeaveLegendRow}>
                    <View style={styles.scheduleLeaveLegendItem}>
                        <View style={styles.scheduleLeaveLegendLabelRow}>
                            <View style={[styles.scheduleLeaveLegendDot, {backgroundColor: c.brandPrimary}]} />
                            <AppText variant="caption" tone="secondary">사용</AppText>
                        </View>
                        <AppText variant="titleMd" tone="primary" style={styles.scheduleLeaveLegendValue}>5일</AppText>
                    </View>
                    <View style={styles.scheduleLeaveLegendItem}>
                        <View style={styles.scheduleLeaveLegendLabelRow}>
                            <View style={[styles.scheduleLeaveLegendDot, {backgroundColor: c.success}]} />
                            <AppText variant="caption" tone="secondary">잔여</AppText>
                        </View>
                        <AppText variant="titleMd" tone="brand" style={styles.scheduleLeaveLegendValue}>6일</AppText>
                    </View>
                </View>
            </AppCard>
            <AppText variant="caption" tone="tertiary" style={styles.scheduleLeaveDisclaimer}>
                참고용 추정이에요. 실제와 다를 수 있어요.
            </AppText>
        </ScreenContainer>
    );
};

const NativeReferenceSubscriptionGate: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer>
            <View style={styles.subscriptionCenter}>
                <Brandmark size={56} label="✦" backgroundColor={c.brandPrimary} />
                <AppText variant="headingMd" center style={styles.subscriptionTitle}>
                    {'비즈니스 플랜에서\n쓸 수 있어요'}
                </AppText>
                <AppText variant="bodyMd" tone="secondary" center style={styles.subscriptionDesc}>
                    급여명세 발급은 비즈니스 플랜 기능이에요. 지금 시작하면 바로 직원에게 명세서를 보낼 수 있어요.
                </AppText>
                <AppCard variant="flat" style={[styles.subscriptionCard, {backgroundColor: c.brandPrimarySoft, borderWidth: 1.5, borderColor: c.brandPrimary}]}>
                    <AppText variant="titleMd" tone="primary" weight="700">비즈니스 플랜</AppText>
                    <AmountText size={20} tone="brand" style={styles.subscriptionPrice}>월 15,000원</AmountText>
                    <AppText variant="caption" tone="tertiary" style={styles.subscriptionSub}>급여명세 발급 · 직원 알림 · 정산 준비 자동화</AppText>
                </AppCard>
                <View style={styles.subscriptionCtas}>
                    <AppButton label="플랜 보기" onPress={() => undefined} />
                    <AppButton label="나중에" variant="ghost" onPress={() => undefined} />
                </View>
            </View>
        </ScreenContainer>
    );
};

const VisualSheetBase: React.FC<{children: React.ReactNode}> = ({children}) => (
    <ScreenContainer header={<AppHeader title="홈" />}>
        {children}
    </ScreenContainer>
);

const NativeReferencePushPrimer: React.FC<{captureMarker: string}> = ({captureMarker}) => {
    const c = useThemeColors();
    const insets = useSafeAreaInsets();
    const onClose = () => undefined;

    return (
        <VisualSheetBase>
            <Modal visible transparent animationType="none" onRequestClose={onClose}>
                <Pressable style={[styles.pushBackdrop, {backgroundColor: c.overlayDark}]} onPress={onClose}>
                    <Pressable
                        style={[styles.pushSheet, {backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 16) + 8}]}
                        onPress={event => event.stopPropagation()}>
                        <Text style={styles.visualRouteMarker}>{captureMarker}</Text>
                        <View style={[styles.pushHandle, {backgroundColor: c.border}]} />
                        <View style={[styles.pushIcon, {backgroundColor: c.brandPrimarySoft}]}>
                            <Ionicons name="notifications" size={22} color={c.brandPrimary} />
                        </View>
                        <AppText variant="headingSm" style={styles.pushTitle} center>중요한 알림만 보내드릴게요</AppText>
                        <AppText variant="bodyMd" tone="secondary" style={styles.pushDescription} center>
                            직원 미출근, 정정 요청, 급여명세 발급 같은 꼭 필요한 소식만 알려드려요.
                        </AppText>
                        <AppButton label="알림 받기" onPress={onClose} style={styles.pushPrimary} />
                        <AppButton label="나중에" variant="ghost" onPress={onClose} style={styles.pushSecondary} />
                    </Pressable>
                </Pressable>
            </Modal>
        </VisualSheetBase>
    );
};

const NativeReferenceEmployeeHome: React.FC = () => (
    <ScreenContainer
        scroll
        header={<AppHeader title="오늘의 소담" actions={[{label: '알림', accessibilityLabel: '알림', onPress: () => undefined}]} />}>
        <AppCard variant="flat" style={styles.homeIntro}>
            <AppText variant="titleMd" weight="700">역할에 맞는 홈으로 이동해요</AppText>
            <AppText variant="bodyMd" tone="secondary" style={styles.homeIntroCopy}>
                사장님은 대시보드, 직원은 출근 버튼, 개인은 기록장으로 바로 진입합니다.
            </AppText>
        </AppCard>
        <View style={styles.homeList}>
            <AppListItem title="사장 홈" subtitle="매장 운영 현황 보기" right="›" onPress={() => undefined} />
            <AppListItem title="직원 홈" subtitle="출근/퇴근 바로가기" right="›" onPress={() => undefined} />
            <AppListItem title="개인 기록장" subtitle="내 근무 시간 직접 기록" right="›" onPress={() => undefined} />
        </View>
    </ScreenContainer>
);

const ATTENDANCE_OVERVIEW_FIXTURE: AttendanceOverviewFixture = {
    storeId: 101,
    pendingEmployees: ['민지'],
    checkedInCount: 1,
    totalActiveEmployees: 3,
    pendingCorrectionCount: 2,
    checkedInEntries: [{name: '도윤', subtitle: '09:54 출근 · 매장 반경 내'}],
    checkoutRiskEntries: [{name: '지아', subtitle: '퇴근 누락 가능성'}],
};

const EMPLOYEE_ATTENDANCE_HOME_IDLE_FIXTURE: EmployeeAttendanceHomeVisualFixture = {
    state: 'IDLE',
    stores: [
        {id: 101, storeName: '카페 소담', appliedHourlyWage: 10500},
        {id: 102, storeName: '소담 베이커리', appliedHourlyWage: 10800},
    ],
    selectedStoreId: 101,
    todayRecord: null,
    weekShifts: [{
        id: 1, employeeId: 1, storeId: 101, shiftDate: new Date().toISOString().slice(0, 10),
        startTime: '09:00', endTime: '18:00',
    }],
    monthlyAttendances: [
        {id: 1, storeId: 101, checkInTime: '2026-07-01T09:00:00+09:00', checkOutTime: '2026-07-01T18:00:00+09:00', workingMinutes: 480, appliedHourlyWage: 10500},
    ],
    policies: [{id: 1, title: '청년내일채움공제', deadline: '2026-08-31', isNew: true}],
    pendingContractCount: 1,
    unreadNoticeCount: 2,
};

const EMPLOYEE_ATTENDANCE_HOME_WORKING_FIXTURE: EmployeeAttendanceHomeVisualFixture = {
    ...EMPLOYEE_ATTENDANCE_HOME_IDLE_FIXTURE,
    state: 'WORKING',
    todayRecord: {id: 2, storeId: 101, checkInTime: '2026-07-20T09:58:00+09:00'},
    nowMs: new Date('2026-07-20T11:28:00+09:00').getTime(),
};

const OWNER_HOME_FIXTURE: OwnerDashboardVisualFixture = {
    stores: [{id: 101, storeName: '카페 소담'}],
    selectedStoreId: 101,
    today: {
        storeId: 101, storeName: '카페 소담', checkedInCount: 4, totalActiveEmployees: 5,
        pendingEmployees: ['민지'], pendingCorrectionCount: 2,
    },
    monthly: {totalGross: 4_200_000, totalNet: 3_800_000, totalWorkingHours: 320, daysRemainingInMonth: 9},
};

const MANAGER_HOME_FIXTURE: ManagerDashboardVisualFixture = {
    delegation: {
        storeId: 101, storeName: '카페 소담', active: true,
        permissions: ['ATTENDANCE_APPROVE', 'SCHEDULE_MANAGE'],
        delegationVersion: 1, acceptedAt: '2026-07-01T00:00:00+09:00',
        signatureStatus: null, signatureEnvelopeId: null,
    },
    today: {
        storeId: 101, storeName: '카페 소담', checkedInCount: 4, totalActiveEmployees: 5,
        pendingEmployees: ['민지'], pendingCorrectionCount: 2,
    },
};

const OWNER_DASHBOARD_DETAIL_FIXTURE: OwnerDashboardDetailVisualFixture = {
    monthly: {totalGross: 4_200_000, totalNet: 3_800_000, totalWorkingHours: 320, daysRemainingInMonth: 9},
};

const STORE_LIST_FIXTURE: StoreListVisualFixture = {
    stores: [
        {id: 101, storeName: '카페 소담', fullAddress: '서울 마포구 소담로 12', employeeCount: 5, todayAttendance: 4},
        {id: 102, storeName: '소담 베이커리', fullAddress: '서울 마포구 연남로 8', employeeCount: 3, todayAttendance: 2},
    ],
};

const STORE_REGISTRATION_FIXTURE: StoreRegistrationVisualFixture = {
    step: 2,
    storeData: {
        storeName: '카페 소담', roadAddress: '서울 마포구 소담로 12', jibunAddress: '서울 마포구 동교동 123-4',
        latitude: 37.5665, longitude: 126.978, radius: 80, storeStandardHourWage: 10030,
    },
};

const STORE_DETAIL_FIXTURE: StoreDetailVisualFixture = {
    store: {
        id: 101, storeName: '카페 소담', businessNumber: '123-45-67890', storePhoneNumber: '02-1234-5678',
        businessType: '카페', storeCode: 'CAFE-4821', fullAddress: '서울 마포구 소담로 12',
        storeStandardHourWage: 10030, employeeCount: 5,
    },
};

const STORE_EDIT_FIXTURE: StoreEditVisualFixture = {
    storeName: '카페 소담', phone: '02-1234-5678', businessType: '카페',
    standardWage: '10030', radius: '80', fullAddress: '서울 마포구 소담로 12',
};

const WORKPLACE_LIST_FIXTURE: WorkplaceListVisualFixture = {
    stores: [
        {id: 101, storeName: '카페 소담', fullAddress: '서울 마포구 소담로 12'},
        {id: 102, storeName: '소담 베이커리', fullAddress: '서울 마포구 연남로 8'},
    ],
};

const WORKPLACE_DETAIL_FIXTURE: WorkplaceDetailVisualFixture = {
    data: {
        employeeId: 1, storeId: 101, storeName: '카페 소담', year: 2026, month: 7,
        summary: {attendanceDays: 18, totalWorkedMinutes: 8640, totalDailyWage: 1_512_000, totalBonusAmount: 0, totalGrossWage: 1_512_000},
        rows: [{date: '2026-07-20', checkInTime: '09:58', checkOutTime: '18:03', workedMinutes: 485, appliedHourlyWage: 10500, dailyWage: 84875, status: 'CONFIRMED'}],
    },
};

const EMPLOYEE_DETAIL_FIXTURE: EmployeeDetailVisualFixture = {
    employee: {
        id: 1, name: '민지', email: 'minji@example.com', role: 'STAFF', appliedHourlyWage: 10500,
        employmentType: 'HOURLY', socialInsuranceEnrolled: null, hireDate: '2026-01-05', isActive: true,
    },
    tab: 'INFO',
    draftContractCount: 1,
    memo: '주말 근무 선호, 오전 오픈조 가능',
};

const WAGE_SETTINGS_FIXTURE: WageSettingsVisualFixture = {
    currentWage: 10030,
    history: [{effectiveDate: '2026-06-01', wage: 10030, reason: '최저임금 인상'}],
    employeeWages: [{employeeId: 1, employeeName: '민지', wage: 10500, isCustom: true} as any],
};

const MASTER_MY_PAGE_FIXTURE: MasterMyPageVisualFixture = {
    stores: [
        {
            id: 101, storeName: '카페 소담', businessNumber: '123-45-67890', storePhoneNumber: '02-1234-5678',
            businessType: '카페', storeCode: 'CAFE-4821', fullAddress: '서울 마포구 소담로 12',
            storeStandardHourWage: 10030, monthlyLaborCost: 4_200_000, employeeCount: 5,
            todayAttendance: 4, monthlyRevenue: 18_500_000,
        },
    ],
    policies: [{id: 1, title: '청년내일채움공제', category: '고용지원', deadline: '2026-08-31', description: '', isNew: true}],
    laborInfo: {minimumWage: 10030, year: 2026, weeklyMaxHours: 52, overtimeRate: 1.5},
    pendingCount: 2,
    timeOffPendingCount: 1,
    masterInfo: {name: '사장님', totalStores: 1, totalEmployees: 5, monthlyTotalLaborCost: 4_200_000},
    nowMs: new Date('2026-07-20T09:00:00+09:00').getTime(),
};

const ATTENDANCE_CALENDAR_FIXTURE: AttendanceCalendarVisualFixture = {
    year: 2026,
    month: 7,
    items: [
        {id: 1, storeId: 101, storeName: '카페 소담', checkInTime: '2026-07-15T09:00:00', checkOutTime: '2026-07-15T18:00:00', workingMinutes: 540, appliedHourlyWage: 10500},
        {id: 2, storeId: 101, storeName: '카페 소담', checkInTime: '2026-07-20T09:58:00', checkOutTime: '2026-07-20T18:03:00', workingMinutes: 485, appliedHourlyWage: 10500},
    ],
    selectedDay: 20,
};

const MISSING_ATTENDANCE_CENTER_FIXTURE: MissingAttendanceVisualFixture = {
    items: [
        {employeeId: 1, employeeName: '김민준', type: 'NO_CHECK_IN', storeName: '카페 소담'},
        {employeeId: 2, employeeName: '이서연', type: 'NO_CHECK_OUT', storeName: '카페 소담', referenceTime: '전날 22:00'},
    ],
};

const PERSONAL_HOME_NOW_MS = new Date('2026-07-20T14:30:00+09:00').getTime();
const PERSONAL_HOME_FIXTURE: PersonalUserVisualFixture = {
    stores: [{id: '101', name: '카페 소담', color: '#FF4D6D', hourlyWage: 10500}],
    selectedStoreId: '101',
    workSessions: {
        '101': {
            storeId: '101', storeName: '카페 소담',
            startTime: new Date(PERSONAL_HOME_NOW_MS - 3 * 3600_000),
            breakStartTime: null, isWorking: true, isOnBreak: false,
            totalWorkTime: 0, totalBreakTime: 0,
        },
    },
    allRecords: [{
        id: 'r1', storeId: '101', storeName: '카페 소담', type: '출근',
        time: '11:30', date: '2026-07-20', timestamp: PERSONAL_HOME_NOW_MS - 3 * 3600_000,
    }],
    nowMs: PERSONAL_HOME_NOW_MS,
};

const ATTENDANCE_AUTHENTICATION_FIXTURE: AttendanceVisualFixture = {
    workplaces: [{id: '101', name: '카페 소담'}],
    selectedWorkplaceId: '101',
    attendanceRecords: [{
        id: 'attendance-v3-20',
        employeeId: '1',
        employeeName: '민지',
        workplaceId: '101',
        workplaceName: '카페 소담',
        date: '2026-07-20',
        checkInTime: '2026-07-20T09:58:00+09:00',
        checkOutTime: '2026-07-20T18:03:00+09:00',
        status: AttendanceStatus.CHECKED_OUT,
        workHours: 8,
        createdAt: '2026-07-20T09:58:00+09:00',
        updatedAt: '2026-07-20T18:03:00+09:00',
    }],
    currentAttendance: null,
    checkInMethod: 'location',
    locationPermissionGranted: true,
    currentLocation: {latitude: 37.5665, longitude: 126.978},
    selectedWage: 10500,
};

const NativeReferenceAttendanceOverview: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer
            padded={false}
            header={<AppHeader title="근태 관리" onBack={() => undefined} actions={[{icon: <Ionicons name="options-outline" size={20} color={c.textSecondary} />, accessibilityLabel: '근태 필터', onPress: () => undefined}]} />}>
            <ScrollView contentContainerStyle={styles.attendanceContent} showsVerticalScrollIndicator={false}>
                <AppCard variant="spot" hero style={styles.attendanceSpotCard}>
                    <AppText variant="headingSm" tone="primary">누락 기록 2건</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.attendanceSpotSub}>
                        오늘 출근 1/3명 · 정산 전 확인이 필요해요.
                    </AppText>
                </AppCard>
                <SegmentedControl options={['오늘', '이번 주', '이번 달']} value={0} onChange={() => undefined} style={styles.attendanceSegment} />
                <View style={styles.attendanceList}>
                    <AppListItem title="민지" subtitle="미출근" left={<Ionicons name="person-circle-outline" size={26} color={c.warning} />} right={<AppBadge label="확인" tone="warning" />} />
                    <AppListItem title="도윤" subtitle="09:54 출근 · 매장 반경 내" left={<Ionicons name="checkmark-circle-outline" size={26} color={c.success} />} right={<AppBadge label="정상" tone="success" />} />
                    <AppListItem title="지아" subtitle="퇴근 누락 가능성" left={<Ionicons name="alert-circle-outline" size={26} color={c.error} />} right={<AppBadge label="누락" tone="error" />} />
                </View>
            </ScrollView>
        </ScreenContainer>
    );
};

type AttendanceStateKind = 'nfc-unsupported' | 'punch-success' | 'punch-failed';

const ATTENDANCE_STATE_SPECS: Record<AttendanceStateKind, {
    header: string;
    headerAction: string;
    glyph: string;
    title: string;
    description: string;
    primary: string;
    secondary?: string;
    color: 'success' | 'warning';
    background: 'successBg' | 'warningBg';
}> = {
    'nfc-unsupported': {
        header: 'NFC 미지원', headerAction: '닫기', glyph: '!',
        title: '이 기기는 NFC를\n지원하지 않아요',
        description: 'GPS 출근 또는 사장님께 수동 요청을 사용할 수 있어요.',
        primary: 'GPS로 출근하기', secondary: '사장님께 수동 요청', color: 'warning', background: 'warningBg',
    },
    'punch-success': {
        header: '출근 완료', headerAction: '닫기', glyph: '✓',
        title: '출근 처리됐어요',
        description: '09:58 · 카페 소담 · 시급 10,500원으로 기록했어요.',
        primary: '근무 시작', color: 'success', background: 'successBg',
    },
    'punch-failed': {
        header: '출근 실패', headerAction: '도움', glyph: '!',
        title: '매장 반경 밖이에요',
        description: '매장 근처에서 다시 시도하거나 사장님께 수동 처리를 요청하세요.',
        primary: '다시 시도', secondary: '수동 요청', color: 'warning', background: 'warningBg',
    },
};

const NativeReferenceAttendanceState: React.FC<{kind: AttendanceStateKind}> = ({kind}) => {
    const c = useThemeColors();
    const spec = ATTENDANCE_STATE_SPECS[kind];
    return (
        <ScreenContainer header={<AppHeader title={spec.header} rightText={spec.headerAction} onRightText={() => undefined} />}>
            <View style={styles.stateCenter}>
                <View style={styles.stateInner}>
                    <View style={[styles.stateMark, {backgroundColor: c[spec.background]}]}>
                        <Text style={[styles.stateMarkText, {color: c[spec.color]}]}>{spec.glyph}</Text>
                    </View>
                    <Text style={[styles.stateTitle, {color: c.textPrimary}]}>{spec.title}</Text>
                    <Text style={[styles.stateCopy, {color: c.textSecondary}]}>{spec.description}</Text>
                    <AppButton label={spec.primary} onPress={() => undefined} style={styles.stateCta} />
                    {spec.secondary ? <AppButton label={spec.secondary} variant="secondary" onPress={() => undefined} style={styles.stateCtaSub} /> : null}
                </View>
            </View>
        </ScreenContainer>
    );
};

const ActualAttendanceState: React.FC<{kind: AttendanceStateKind}> = ({kind}) => {
    if (kind === 'nfc-unsupported') {
        return <NfcUnsupportedScreen onGps={() => undefined} onManual={() => undefined} onClose={() => undefined} />;
    }
    if (kind === 'punch-success') {
        return <PunchSuccessScreen time="09:58" storeName="카페 소담" wage={10500} onStart={() => undefined} onClose={() => undefined} />;
    }
    return <PunchFailedScreen onRetry={() => undefined} onManual={() => undefined} />;
};

/* 61 CheckoutConfirmSheet — independent transcription: same fixture values, hand-built content
   (not a call to the exported CheckoutConfirmSheet function) so a regression in that component's
   copy/wiring is visible as a diff instead of silently matching itself. */
const CHECKOUT_CONFIRM_WORKED_SECONDS = 3 * 3600 + 12 * 60;
const CHECKOUT_CONFIRM_EXPECTED_PAY = 33600;

const NativeReferenceCheckoutConfirm: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BottomSheet
        visible
        onClose={() => undefined}
        captureMarker={captureMarker}
        title="퇴근 처리할까요?"
        description={`오늘 근무시간 ${formatTimer(CHECKOUT_CONFIRM_WORKED_SECONDS)} · 예상 일급 ${formatMoney(CHECKOUT_CONFIRM_EXPECTED_PAY)}`}
        primary={{label: '퇴근 처리', onPress: () => undefined}}
        secondary={{label: '휴게시간 추가', onPress: () => undefined}}
    />
);

const ActualCheckoutConfirm: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <CheckoutConfirmSheet
        visible
        onClose={() => undefined}
        captureMarker={captureMarker}
        workedSeconds={CHECKOUT_CONFIRM_WORKED_SECONDS}
        expectedPay={CHECKOUT_CONFIRM_EXPECTED_PAY}
        onConfirm={() => undefined}
        onAddBreak={() => undefined}
    />
);

/* 79 BreakTimerSheet — content is fully static inside the exported component (no props feed
   copy), so there is nothing distinct to hand-transcribe: render the same presentational
   component for both sides. */
const VisualBreakTimerSheet: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BreakTimerSheet visible onClose={() => undefined} onStart={() => undefined} onManual={() => undefined} captureMarker={captureMarker} />
);

/* 78 ManualRecordSheet — the exported component owns its own text-input state (no prefill prop
   exists), so both sides necessarily render the same empty-form state. */
const VisualManualRecordSheet: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <ManualRecordSheet visible onClose={() => undefined} onSave={() => undefined} captureMarker={captureMarker} />
);

/* 80 PersonalRecordEditSheet — independent transcription of the pre-filled example, using the
   same `initial`/`expectedPay` props the real component accepts. */
const PERSONAL_RECORD_EDIT_INITIAL = {date: '20260524', checkIn: '1000', checkOut: '1530', wage: '10500'};
const PERSONAL_RECORD_EDIT_EXPECTED_PAY = 57750;

const NativeReferencePersonalRecordEdit: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BottomSheet visible onClose={() => undefined} captureMarker={captureMarker} scrollable title="기록 수정"
        description={`예상 급여 ${formatMoney(PERSONAL_RECORD_EDIT_EXPECTED_PAY)}`}
        primary={{label: '수정 저장', onPress: () => undefined}}>
        <View style={styles.personalRecordEditForm}>
            <AppInput label="근무일" value={PERSONAL_RECORD_EDIT_INITIAL.date} onChangeText={() => undefined} keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />
            <AppInput label="출근" value={PERSONAL_RECORD_EDIT_INITIAL.checkIn} onChangeText={() => undefined} keyboardType="number-pad" maxLength={4} helper={TIME_DIGITS_HELPER} />
            <AppInput label="퇴근" value={PERSONAL_RECORD_EDIT_INITIAL.checkOut} onChangeText={() => undefined} keyboardType="number-pad" maxLength={4} helper={TIME_DIGITS_HELPER} />
            <AppInput label="시급 (원)" value={PERSONAL_RECORD_EDIT_INITIAL.wage} onChangeText={() => undefined} keyboardType="number-pad" />
        </View>
    </BottomSheet>
);

const ActualPersonalRecordEdit: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <PersonalRecordEditSheet
        visible
        onClose={() => undefined}
        captureMarker={captureMarker}
        initial={PERSONAL_RECORD_EDIT_INITIAL}
        expectedPay={PERSONAL_RECORD_EDIT_EXPECTED_PAY}
        onSave={() => undefined}
    />
);

/* 29 SalaryDetail — independent transcription. */
const SALARY_DETAIL_SUMMARY = {
    payrollId: 1, employeeId: 1, employeeName: '김민지', storeId: 101, storeName: '카페 소담',
    totalHours: 92, totalPay: 934122, status: 'CONFIRMED',
    period: {startDate: '2026-05-01', endDate: '2026-05-31'},
};
const SALARY_DETAIL_ITEMS = [
    {workDate: '2026-05-01', totalHours: 8, dailyWage: 84000, regularHours: 8, regularWage: 84000, baseHourlyWage: 10500},
    {workDate: '2026-05-02', totalHours: 8, dailyWage: 84000, regularHours: 8, regularWage: 84000, baseHourlyWage: 10500},
    {workDate: '2026-05-03', totalHours: 9, dailyWage: 94500, regularHours: 8, regularWage: 84000, overtimeHours: 1, overtimeWage: 10500, baseHourlyWage: 10500},
];
const SALARY_DETAIL_FIXTURE: SalaryDetailVisualFixture = {summary: SALARY_DETAIL_SUMMARY, items: SALARY_DETAIL_ITEMS};

const NativeReferenceSalaryDetail: React.FC = () => (
    <ScreenContainer scroll header={<AppHeader title="급여 상세" onBack={() => undefined} />}
        footer={
            <CtaStack bordered>
                <AppButton label="명세서 미리보기" onPress={() => undefined} />
                <AppButton label="명세서 공유하기" variant="secondary" onPress={() => undefined} />
                <AppButton label="계산 근거 보기" variant="ghost" onPress={() => undefined} />
            </CtaStack>
        }>
        <View style={styles.salaryDetailHero}>
            <HeroNumber
                label={`근로자 ${SALARY_DETAIL_SUMMARY.employeeName} · 매장 ${SALARY_DETAIL_SUMMARY.storeName}`}
                value={formatMoney(SALARY_DETAIL_SUMMARY.totalPay)}
                sub={`${SALARY_DETAIL_SUMMARY.period.startDate} ~ ${SALARY_DETAIL_SUMMARY.period.endDate}`}
                accent
            />
        </View>
        <AppCard variant="warm" style={styles.salaryDetailSummary}>
            <View style={styles.salaryDetailRow}>
                <AppText variant="bodyMd" tone="secondary">총 근무시간</AppText>
                <AppText variant="bodyMd" weight="700">{SALARY_DETAIL_SUMMARY.totalHours}h</AppText>
            </View>
            <View style={styles.salaryDetailRow}>
                <AppText variant="bodyMd" tone="secondary">실수령액</AppText>
                <AppText variant="titleMd" weight="700" tone="brand">{formatMoney(SALARY_DETAIL_SUMMARY.totalPay)}</AppText>
            </View>
        </AppCard>
        <AppText variant="titleMd" style={styles.salaryDetailSubtitle}>상세 항목</AppText>
        <AppCard variant="plain" style={styles.salaryDetailItemsCard}>
            {SALARY_DETAIL_ITEMS.map((it, idx) => (
                <View key={idx} style={[styles.salaryDetailItemRow, idx < SALARY_DETAIL_ITEMS.length - 1 ? styles.salaryDetailItemBorder : null]}>
                    <View style={styles.salaryDetailItemLabel}>
                        <AppText variant="bodyMd" weight="600" numberOfLines={1}>{it.workDate}</AppText>
                        <AppText variant="caption" tone="tertiary">{it.totalHours}h</AppText>
                    </View>
                    <AppText variant="titleMd" weight="700" numberOfLines={1}>{formatMoney(it.dailyWage)}</AppText>
                </View>
            ))}
        </AppCard>
    </ScreenContainer>
);

/* 67 계산 근거 — independent transcription, reuses summary/items from card 29. */
const NativeReferencePayrollCalculationDetail: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BottomSheet visible onClose={() => undefined} captureMarker={captureMarker} title="계산 근거" scrollable
        primary={{label: '확인', onPress: () => undefined}}>
        <View style={styles.calcDetailBody}>
            <MoneyCard
                label={`${SALARY_DETAIL_SUMMARY.employeeName} · ${SALARY_DETAIL_SUMMARY.period.startDate} ~ ${SALARY_DETAIL_SUMMARY.period.endDate}`}
                value={formatMoney(SALARY_DETAIL_SUMMARY.totalPay)}
                style={styles.calcDetailMoney}
            />
            <View style={styles.calcDetailRow}>
                <View style={styles.salaryDetailItemLabel}>
                    <AppText variant="bodyMd" weight="600">기본 근무</AppText>
                    <AppText variant="caption" tone="tertiary">24.0h × 10,500원</AppText>
                </View>
                <AppText variant="bodyMd" weight="700">{formatMoney(252000)}</AppText>
            </View>
            <View style={styles.calcDetailRow}>
                <View style={styles.salaryDetailItemLabel}>
                    <AppText variant="bodyMd" weight="600">연장근무</AppText>
                    <AppText variant="caption" tone="tertiary">1.0h</AppText>
                </View>
                <AppText variant="bodyMd" weight="700">{formatMoney(10500)}</AppText>
            </View>
            <View style={[styles.calcDetailDivider, {backgroundColor: useThemeColors().divider}]} />
            <View style={styles.calcDetailRow}>
                <View style={styles.salaryDetailItemLabel}>
                    <AppText variant="titleMd" weight="700">실수령액</AppText>
                    <AppText variant="caption" tone="tertiary">소담 정산 기준</AppText>
                </View>
                <AppText variant="titleMd" weight="700" tone="brand">{formatMoney(SALARY_DETAIL_SUMMARY.totalPay)}</AppText>
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.calcDetailNote}>
                세금·주휴수당 등 추가 공제/가산 내역은 급여 지급 내역서 PDF에서 확인할 수 있어요.
            </AppText>
        </View>
    </BottomSheet>
);

/* 30/68/69 PayrollRun — 3단계(미리보기/확인/완료)를 전부 아우르는 복합 마법사라, reference/actual
   양쪽 다 동일한(이미 fixture로 완전히 결정형인) 실제 컴포넌트를 재사용한다. 다른 화면과 달리
   손으로 재현하지 않는 의도적 예외 — 리스트/카드가 많은 3단계 전체를 독립 재현하는 비용 대비
   회귀 탐지 이득이 낮다고 판단(컴포넌트 자체가 깨지면 이 화면들만으로는 못 잡지만, 다른 화면들의
   AppCard/HeroNumber/StepScaffold 등 공용 DS 회귀는 여전히 잡힌다). */
const PAYROLL_PREVIEWS_FIXTURE = [
    {employeeId: 1, employeeName: '민지', regularHours: 80, regularWage: 840000, overtimeHours: 0, overtimeWage: 0, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 126000, bonusWage: 0, grossWage: 966000, taxAmount: 31878, netWage: 934122},
    {employeeId: 2, employeeName: '도윤', regularHours: 88, regularWage: 924000, overtimeHours: 2.5, overtimeWage: 39375, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 126000, bonusWage: 0, grossWage: 1089375, taxAmount: 35949, netWage: 1053426},
    {employeeId: 3, employeeName: '지아', regularHours: 64, regularWage: 672000, overtimeHours: 0, overtimeWage: 0, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 100800, bonusWage: 0, grossWage: 772800, taxAmount: 25502, netWage: 747298},
];
const PAYROLL_RUN_PREVIEW_FIXTURE: PayrollRunVisualFixture = {step: 'PREVIEW', previews: PAYROLL_PREVIEWS_FIXTURE, startDate: '20260501', endDate: '20260531'};
const PAYROLL_RUN_CONFIRM_FIXTURE: PayrollRunVisualFixture = {step: 'CONFIRM', previews: PAYROLL_PREVIEWS_FIXTURE, startDate: '20260501', endDate: '20260531'};
const PAYROLL_RUN_DONE_FIXTURE: PayrollRunVisualFixture = {step: 'DONE', previews: PAYROLL_PREVIEWS_FIXTURE, startDate: '20260501', endDate: '20260531'};

/* 31 Subscribe — independent transcription of the active-subscription state. */
const SUBSCRIBE_PLANS_FIXTURE = [
    {name: 'FREE' as const, displayName: '무료', monthlyPriceKrw: 0, description: ''},
    {name: 'STARTER' as const, displayName: '스타터', monthlyPriceKrw: 9900, description: ''},
    {name: 'PRO' as const, displayName: '프로', monthlyPriceKrw: 19900, description: ''},
    {name: 'PREMIUM' as const, displayName: '프리미엄', monthlyPriceKrw: 39900, description: ''},
];
const SUBSCRIBE_CURRENT_FIXTURE = {
    plan: 'PRO' as const, status: 'ACTIVE' as const, billingCycle: 'MONTHLY' as const,
    nextBillingAt: '2026-06-25T00:00:00', cardLabel: '카드 ****4821',
};
const SUBSCRIBE_FIXTURE: SubscribeVisualFixture = {
    plans: SUBSCRIBE_PLANS_FIXTURE, current: SUBSCRIBE_CURRENT_FIXTURE as any, selectedPlan: 'PRO',
};

/* 70 PDFPreview — independent transcription of the pdf-preview card. */
const PDF_PREVIEW_FIXTURE = {title: '급여명세서.pdf', sub: '김민지 · 2026년 5월'};

const NativeReferencePdfPreview: React.FC = () => (
    <ScreenContainer
        scroll
        header={<AppHeader title="PDF 미리보기" onBack={() => undefined} actions={[{label: '공유', onPress: () => undefined}]} />}
        footer={
            <CtaStack bordered>
                <AppButton label="다운로드" onPress={() => undefined} />
                <AppButton label="공유하기" variant="secondary" onPress={() => undefined} />
            </CtaStack>
        }>
        <AppCard variant="flat" style={styles.pdfPreviewPage}>
            <View style={styles.pdfPreviewDoc}>
                <AppText variant="titleMd">{PDF_PREVIEW_FIXTURE.title}</AppText>
                <AppText variant="caption" tone="tertiary" style={styles.pdfPreviewSub}>{PDF_PREVIEW_FIXTURE.sub}</AppText>
            </View>
        </AppCard>
    </ScreenContainer>
);

/* 71 BillingMethod — independent transcription. */
const NativeReferenceBillingMethod: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BottomSheet visible onClose={() => undefined} captureMarker={captureMarker} title="결제 수단"
        description="카드 정보는 소담에 저장되지 않아요. 토스페이먼츠에서 안전하게 관리돼요."
        primary={{label: '결제 수단 변경', onPress: () => undefined}}
        secondary={{label: '닫기', variant: 'ghost', onPress: () => undefined}}>
        <View style={styles.billingMethodBox}>
            <AppText variant="caption" tone="secondary">현재 결제 수단</AppText>
            <AppText variant="titleMd" style={styles.billingMethodValue}>카드 ****4821</AppText>
            <AppText variant="caption" tone="tertiary" style={styles.billingMethodNext}>다음 결제 2026.06.25</AppText>
        </View>
    </BottomSheet>
);

/* 72 PlanDetail — independent transcription of the PRO plan detail. */
const PLAN_DETAIL_VIEW_FIXTURE: PlanCardView = {
    name: 'PRO', displayName: '프로', priceLabel: '월 19,900원', emoji: '👑', recommended: true,
    highlights: [
        {text: '급여명세 발급', included: true},
        {text: '정산 준비율', included: true},
        {text: '멀티매장', included: true},
    ],
};

const NativeReferencePlanDetail: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BottomSheet visible onClose={() => undefined} captureMarker={captureMarker} scrollable title={`${PLAN_DETAIL_VIEW_FIXTURE.displayName} 플랜`}
        primary={{label: '이 플랜 사용하기', onPress: () => undefined}}
        secondary={{label: '닫기', variant: 'ghost', onPress: () => undefined}}>
        <View style={styles.planDetailBody}>
            <AppCard variant="spot" style={styles.planDetailPriceCard}>
                <AppText variant="headingSm" tone="brand">{PLAN_DETAIL_VIEW_FIXTURE.priceLabel}</AppText>
                <AppText variant="caption" tone="secondary" style={styles.planDetailRecommended}>
                    대부분의 사장님이 선택하는 플랜이에요.
                </AppText>
            </AppCard>
            {PLAN_DETAIL_VIEW_FIXTURE.highlights.map((h, idx) => (
                <View key={idx} style={styles.planDetailRow}>
                    <AppText variant="bodyMd" style={styles.planDetailRowText}>{h.text}</AppText>
                    <AppBadge label="포함" tone="success" />
                </View>
            ))}
        </View>
    </BottomSheet>
);

/* 32-38/73-74 05-info 그룹 — 목록/필터/서비스 연동이 많은 화면이라 30/68/69/31과 같은 이유로
 * reference/actual 양쪽 다 실제 컴포넌트를 visualFixture로 재사용한다. */
const INFO_CATEGORIES_FIXTURE = [
    {id: 'wage', name: '임금', description: '최저임금·주휴수당'},
    {id: 'contract', name: '근로계약', description: '계약서·해고'},
    {id: 'insurance', name: '4대보험', description: '가입·신고'},
];
const INFO_ARTICLES_FIXTURE: InfoArticle[] = [
    {
        id: '201', categoryId: 'wage', title: '2026년 최저임금, 이렇게 달라져요',
        summary: '시간당 최저임금이 인상되며 주휴수당 산정 기준도 함께 바뀝니다.',
        content: '2026년 최저임금은 시간당 10,320원으로 인상됩니다. 주 15시간 이상 근무한 직원에게는 주휴수당을 별도로 지급해야 하며, 최저임금 미달 시 3년 이하 징역 또는 2천만원 이하 벌금에 처해질 수 있습니다.',
        publishDate: '2026-01-02T00:00:00', author: '소담 노무팀', tags: ['최저임금', '주휴수당'],
    },
    {
        id: '202', categoryId: 'wage', title: '주휴수당 지급 기준 총정리',
        summary: '주 15시간 이상 근무했다면 주휴수당 대상이에요.',
        content: '주휴수당은 1주 동안 소정근로일을 개근하고, 근로시간이 15시간 이상인 근로자에게 유급휴일을 주는 제도입니다. 시급제·일급제 모두 적용되며, 결근이 있으면 해당 주는 지급하지 않습니다.',
        publishDate: '2025-12-20T00:00:00', author: '소담 노무팀', tags: ['주휴수당'],
    },
];

const LABOR_INFO_DETAIL_FIXTURE = {
    id: 201, title: INFO_ARTICLES_FIXTURE[0].title, date: '2026-01-02',
    content: INFO_ARTICLES_FIXTURE[0].content, author: '소담 노무팀', views: 128, category: '노무 정보',
};
const POLICY_DETAIL_FIXTURE = {
    id: 301, title: '소상공인 경영안정자금 2026년 상반기 접수', date: '2026-01-15',
    content: '소상공인시장진흥공단이 운영하는 경영안정자금 지원 사업입니다. 최대 7천만원까지 저금리로 융자받을 수 있으며, 매출 감소를 증빙하면 우대금리가 적용됩니다. 신청은 소상공인정책자금 누리집에서 가능합니다.',
    department: '소담 정책팀',
};
const TAX_INFO_DETAIL_FIXTURE = {
    id: 401, title: '부가가치세 예정신고, 놓치지 마세요', date: '2026-01-10',
    content: '개인사업자 일반과세자는 1월과 7월에 부가가치세를 확정신고합니다. 직전 과세기간 대비 매출이 늘었다면 예정고지 대신 예정신고를 선택하는 것이 유리할 수 있습니다. 신고 기한을 넘기면 가산세가 부과됩니다.',
    author: '소담 세무팀', category: '세무 정보',
};
const TIPS_DETAIL_FIXTURE = {
    id: 501, title: '피크타임 대기줄 줄이는 3가지 방법',
    summary: '주문 동선만 바꿔도 회전율이 눈에 띄게 좋아져요.',
    content: '① 포장 주문 전용 픽업대를 매장 입구 근처에 따로 두세요. ② 결제와 서빙 담당을 분리하면 병목이 줄어듭니다. ③ 피크타임 30분 전 미리 재료를 소분해 두면 조리 시간을 단축할 수 있어요.',
    date: '2026-01-08', author: '소담 창업팀', tags: ['운영 효율', '피크타임'],
};
const NOTIFICATION_CENTER_FIXTURE = [
    {id: 1, category: 'ATTENDANCE' as const, title: '김민지님이 출근했어요', body: '오늘 09:58 출근 · GPS 인증', deepLink: 'sodam://attendance', isRead: false, createdAt: '2026-01-20T09:58:00'},
    {id: 2, category: 'PAYROLL' as const, title: '1월 급여명세서가 발급됐어요', body: '실수령액 2,180,400원', deepLink: 'sodam://salary', isRead: false, createdAt: '2026-01-19T10:00:00'},
    {id: 3, category: 'BILLING' as const, title: '구독 결제가 완료됐어요', body: '프로 플랜 · 19,900원', deepLink: 'sodam://subscription', isRead: true, createdAt: '2026-01-15T08:00:00'},
    {id: 4, category: 'NOTICE' as const, title: '설 연휴 매장 운영시간 안내', body: '2/16~2/18 임시 휴무입니다', isRead: true, createdAt: '2026-01-10T09:00:00'},
];

/* 75 LogoutConfirm — SettingsScreen/AccountSettingsScreen 둘 다 트리거하는 전역
 * ConfirmSheet 문구를 그대로 재현(문구 자체는 고정 상수라 손 전사 리스크 낮음). */
const VisualLogoutConfirm: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BottomSheet visible onClose={() => undefined} captureMarker={captureMarker} title="로그아웃할까요?"
        description="다시 로그인하면 모든 기록을 이어서 볼 수 있어요."
        primary={{label: '로그아웃', onPress: () => undefined}}
        secondary={{label: '취소', variant: 'ghost', onPress: () => undefined}}
    />
);

/* 53 주소 검색 시트 — 실 AddressSearchModal은 카카오 우편번호 WebView(외부 CDN 스크립트)를
 * 그대로 로드해 네트워크 상태에 따라 매 캡처마다 다르게 그려진다(결정적 캡처 불가능).
 * 노무사 게이트와 같은 이유는 아니지만 동일한 처방을 적용: 실 파일은 건드리지 않고
 * 시안 문구를 그대로 옮긴 독립 전사 컴포넌트만 reference/actual 양쪽에 재사용한다. */
const VisualAddressSearchSheet: React.FC<{captureMarker: string}> = ({captureMarker}) => (
    <BottomSheet visible onClose={() => undefined} captureMarker={captureMarker} title="주소를 선택하세요">
        <AppInput label="매장 주소 검색" value="서울 마포구 소담로 12" onChangeText={() => undefined} />
        <View style={styles.addressSearchList}>
            <AppListItem title="서울 마포구 소담로 12" subtitle="카페 소담 근처" onPress={() => undefined} />
            <AppListItem title="서울 마포구 소담로 18" subtitle="도로명 주소" onPress={() => undefined} />
        </View>
        <AppButton label="이 주소로 설정" onPress={() => undefined} style={styles.addressSearchCta} />
    </BottomSheet>
);

/* 81 ToastExamples / 82 ComponentRules — 실제 화면이 아닌 순수 디자인 참조 카드라
 * 46/47처럼 독립 전사 컴포넌트로 재현(reference/actual 동일). */
const VisualToastExamples: React.FC = () => (
    <ScreenContainer header={<AppHeader title="토스트" actions={[{label: '예시', onPress: () => undefined}]} />}>
        <AppCard variant="flat">
            <AppText variant="titleMd">토스트 위치</AppText>
            <AppText variant="bodyMd" tone="secondary" style={styles.toastExampleNote}>
                하단 탭 또는 CTA 위에 2.2초 표시합니다.
            </AppText>
        </AppCard>
        <View style={styles.toastExampleToast}>
            <View style={styles.flex}>
                <AppText variant="titleMd">초대 코드를 복사했어요</AppText>
                <AppText variant="caption" tone="secondary">직원에게 바로 공유할 수 있어요.</AppText>
            </View>
            <AppBadge label="완료" tone="success" />
        </View>
    </ScreenContainer>
);

const COMPONENT_RULES_ITEMS = [
    {title: '터치 영역', sub: '모든 요소 최소 44px'},
    {title: 'Primary CTA', sub: '화면당 하나만 강하게'},
    {title: 'Badge', sub: '정상/주의/오류/정보 색상 고정'},
    {title: 'Input Error', sub: '필드 아래 12px 문구'},
    {title: 'Bottom Sheet', sub: 'safe-area 포함, 키보드 대응'},
];

const VisualComponentRules: React.FC = () => (
    <ScreenContainer header={<AppHeader title="컴포넌트 규칙" actions={[{label: '최종', onPress: () => undefined}]} />}>
        <View style={styles.componentRulesList}>
            {COMPONENT_RULES_ITEMS.map((item, idx) => (
                <View key={idx} style={styles.componentRulesRow}>
                    <View style={styles.componentRulesDot}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                    <View style={styles.flex}>
                        <AppText variant="titleMd">{item.title}</AppText>
                        <AppText variant="caption" tone="secondary">{item.sub}</AppText>
                    </View>
                </View>
            ))}
        </View>
    </ScreenContainer>
);

/* 07 recruitment 그룹 — R3/R4/R5는 실 API·route.params 의존이라 42/45와 같은 이유로 최소
 * fixture 를 시각검증 전용 prop 으로 주입해 재사용한다(reference/actual 동일 컴포넌트). */
const RECRUITMENT_POSTING_FIXTURE: JobPostingNearbyItem = {
    postingId: 901, storeId: 1, storeName: '굿모닝분식 서초점',
    workType: 'REGULAR', jobCategory: 'RESTAURANT_HALL', workDate: null,
    startTime: '17:00:00', endTime: '22:00:00', hourlyWage: 10500,
    message: '평일 저녁 시간대 도와주실 분을 찾고 있어요.', distanceMeters: 650,
};

const RECRUITMENT_NEARBY_LIST_FIXTURE: JobPostingNearbyItem[] = [
    RECRUITMENT_POSTING_FIXTURE,
    {
        postingId: 902, storeId: 2, storeName: '카페별빛 홍대점',
        workType: 'SUBSTITUTE', jobCategory: 'CAFE', workDate: '2026-07-21',
        startTime: '09:00:00', endTime: '15:00:00', hourlyWage: 11000,
        message: null, distanceMeters: 1200,
    },
];

const RECRUITMENT_OFFER_INBOX_FIXTURE = {
    nowMs: new Date('2026-07-20T13:20:00').getTime(),
    offers: [{
        id: 701, storeId: 1, storeName: '굿모닝분식 서초점',
        workType: 'REGULAR' as const, workDate: '2026-07-22',
        startTime: '17:00:00', endTime: '22:00:00', hourlyWage: 10500,
        message: '평일 저녁 시간대 도와주실 분을 찾고 있어요.', status: 'PENDING' as const,
        expiresAt: '2026-12-31T23:59:59', createdAt: '2026-07-20T10:00:00',
        respondedAt: null, storeCode: null,
    }],
    applications: [{
        id: 801, postingId: 902, storeId: 2, storeName: '카페별빛 홍대점',
        workType: 'SUBSTITUTE' as const, jobCategory: 'CAFE' as const, workDate: '2026-07-21',
        startTime: '09:00:00', endTime: '15:00:00', hourlyWage: 11000,
        message: null, status: 'ACCEPTED' as const, createdAt: '2026-07-19T10:00:00',
        respondedAt: '2026-07-19T12:00:00', storeCode: 'CAFE-9931',
    }],
};

const RECRUITMENT_APPLICANTS_FIXTURE = [{
    applicationId: 801, applicantUserId: 501, applicantName: '박도담', age: 22,
    currentEmployment: {storeName: '카페별빛 홍대점', hireDate: '2026-03-02'},
    message: '평일 저녁 근무 가능합니다.', status: 'PENDING' as const,
    createdAt: '2026-07-19T10:00:00', respondedAt: null,
}];

const RECRUITMENT_SEEKER_LIST_FIXTURE: JobSeekerListItem[] = [{
    userId: 501, name: '박도담', age: 22,
    currentEmployment: {storeName: '카페별빛 홍대점', hireDate: '2026-03-02'},
    desiredLocations: ['서울 마포구 서교동'],
    seekingTypes: ['REGULAR'], jobCategories: ['CAFE'],
    categoryMatched: true,
    availability: [{day: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00'}],
    availableToday: true, distanceMeters: 650, offerStatus: null,
}];

const RECRUITMENT_JOB_SEEKING_PROFILE_FIXTURE: JobSeekingProfile = {
    eligible: true, seeking: true,
    locations: [{address: '서울 마포구 서교동'}, {address: ''}],
    seekingTypes: ['REGULAR'], jobCategories: ['CAFE', 'BAKERY'],
    availability: [
        {day: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00'},
        {day: 'TUESDAY', startTime: '09:00:00', endTime: '18:00:00'},
        {day: 'THURSDAY', startTime: '09:00:00', endTime: '18:00:00'},
        {day: 'FRIDAY', startTime: '09:00:00', endTime: '18:00:00'},
    ],
    currentEmployment: {storeName: '카페별빛 홍대점', hireDate: '2026-03-02'},
};

const RECRUITMENT_SEEKER_FIXTURE: JobSeekerListItem = {
    userId: 501, name: '박도담', age: 22,
    currentEmployment: {storeName: '카페별빛 홍대점', hireDate: '2026-03-02'},
    desiredLocations: ['서울 마포구 서교동'],
    seekingTypes: ['REGULAR'], jobCategories: ['CAFE', 'RESTAURANT_HALL'],
    categoryMatched: true,
    availability: [
        {day: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00'},
        {day: 'TUESDAY', startTime: '09:00:00', endTime: '18:00:00'},
    ],
    availableToday: true, distanceMeters: 650, offerStatus: null,
};

/* C4 SendContractScreen / C7 ElectronicSignScreen — 노무사 검토 미완료 게이트(CLAUDE.md ⛔:
 * CONTRACT_MANAGE/PAYROLL_CONFIRM 권한 부여 흐름) 대상 화면. 실제 SendContractScreen.tsx /
 * ElectronicSignScreen.tsx 는 절대 수정하지 않고, 시안 문구를 그대로 옮긴 독립 전사 컴포넌트로만
 * 캡처한다(read-only, reference/actual 동일). */
const VisualSendContractStep3: React.FC = () => (
    <ScreenContainer scroll header={<AppHeader title="근로계약서 보내기" />}>
        <View style={styles.contractStepsRow}>
            {['done', 'done', 'active', ''].map((state, idx) => (
                <View key={idx} style={styles.contractStepDotWrap}>
                    <View style={[
                        styles.contractStepDot,
                        state === 'done' && styles.contractStepDotDone,
                        state === 'active' && styles.contractStepDotActive,
                    ]}>
                        <AppText variant="caption" weight="800" style={state ? styles.contractStepDotTextOn : undefined}>
                            {state === 'done' ? '✓' : idx + 1}
                        </AppText>
                    </View>
                    {idx < 3 ? <View style={[styles.contractStepLine, (state === 'done') && styles.contractStepLineDone]} /> : null}
                </View>
            ))}
        </View>

        <AppText variant="caption" tone="secondary" weight="800" style={styles.contractSectionLabel}>임금</AppText>
        <SegmentedControl options={['스케줄로 자동 계산', '월급 직접 입력']} value={0} onChange={() => undefined} />
        <AppInput label="기준시급(원)" value="10,500" editable={false} containerStyle={styles.contractField} />
        <View style={styles.contractRow}>
            <AppText variant="bodyMd" tone="secondary">주 소정근로시간</AppText>
            <AppText variant="bodyMd" weight="700">20시간</AppText>
        </View>
        <View style={styles.contractRow}>
            <AppText variant="bodyMd" tone="secondary">지급방법</AppText>
            <AppText variant="bodyMd" weight="700">계좌이체</AppText>
        </View>
        <View style={styles.contractRow}>
            <AppText variant="bodyMd" tone="secondary">임금 지급일</AppText>
            <AppText variant="bodyMd" weight="700">매월 25일</AppText>
        </View>
        <AppCard variant="flat" style={styles.contractInfoCard}>
            <AppText variant="titleMd">4대보험 적용</AppText>
            <AppText variant="bodyMd" tone="secondary">고용보험 · 산재보험 · 국민연금 · 건강보험</AppText>
        </AppCard>
        <AppButton label="다음" onPress={() => undefined} style={styles.contractNextBtn} />
    </ScreenContainer>
);

const VisualElectronicSignProgress: React.FC = () => (
    <ScreenContainer padded={false} header={<AppHeader title="전자서명" />}>
        <View style={styles.esignContent}>
            <AppCard variant="spot" hero>
                <AppText variant="caption" tone="secondary">근로계약서</AppText>
                <AppText variant="headingMd" tone="primary" style={styles.esignCardTitle}>서명 순서를 확인해 주세요</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.esignMutedInverse}>문서 버전 3 · SHA-256 8f2c…</AppText>
            </AppCard>

            <View style={styles.esignSection}>
                <AppText variant="titleMd">서명 진행 상태</AppText>
                <AppCard variant="plain">
                    <View style={styles.esignRow}>
                        <AppText variant="titleMd" style={styles.flex}>1. 사업주</AppText>
                        <AppBadge label="완료" tone="success" />
                    </View>
                </AppCard>
                <AppCard variant="plain">
                    <View style={styles.esignRow}>
                        <AppText variant="titleMd" style={styles.flex}>2. 직원</AppText>
                        <AppBadge label="진행 중" tone="info" />
                    </View>
                </AppCard>
            </View>

            <AppCard variant="warm">
                <AppText variant="titleMd">현재 서명 안내</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.esignDescription}>
                    요청 후 인증 앱에서 문서 내용을 확인하고 서명해 주세요. 앱으로 돌아오면 서버 검증 결과를 다시 조회하며, 화면 복귀만으로 완료 처리하지 않습니다.
                </AppText>
                <AppButton label="전자서명 요청 보내기" onPress={() => undefined} style={styles.esignAction} />
                <AppButton label="서명 상태 다시 확인" variant="secondary" onPress={() => undefined} style={styles.esignAction} />
            </AppCard>
        </View>
    </ScreenContainer>
);

const PAYROLL_PREVIEW_FIXTURE: PayrollPreview = {
    hourlyWage: 10030, weeklyHours: 15,
    weeklyBasic: 150450, weeklyAllowance: 30090,
    monthlyBasic: 952865, monthlyAllowance: 129540, monthlyGross: 1082405,
    weeklyAllowanceEligible: true,
    disclaimer: '실제 급여는 매장 정산 방식에 따라 달라질 수 있어요.',
};

/* N8 SendBonusScreen — 노무사 검토 미완료 게이트(CLAUDE.md ⛔: PAYROLL_CONFIRM 관련
 * PayrollHighRiskActionService 흐름) 대상 화면. SendBonusScreen.tsx 는 절대 수정하지 않고,
 * 시안 문구를 그대로 옮긴 독립 전사 컴포넌트로만 캡처한다(read-only, reference/actual 동일). */
const VisualSendBonus: React.FC = () => (
    <ScreenContainer scroll header={<AppHeader title="즉시 보너스" />}>
        <AppText variant="titleMd" weight="800" style={styles.bonusEmployeeName}>김민지</AppText>
        <AppCard variant="flat" style={styles.bonusInfoCard}>
            <AppText variant="bodyMd" tone="secondary">
                비정기 포상금은 근로소득 과세 대상이지만 통상임금·최저임금 계산에는 포함되지 않아요.
            </AppText>
        </AppCard>
        <AppInput label="지급 결정일" value="20260701" editable={false} containerStyle={styles.bonusField} />
        <AppInput label="금액(원)" placeholder="예: 50,000" editable={false} containerStyle={styles.bonusField} />
        <SegmentedControl options={['즉시 현금 지급', '다음 급여에 합산']} value={0} onChange={() => undefined} />
        <AppInput label="사유(선택)" placeholder="예: 성수기 노고 격려" editable={false} containerStyle={styles.bonusField} />
        <AppButton label="보너스 지급하기" onPress={() => undefined} style={styles.bonusCta} />
        <AppText variant="caption" tone="secondary" weight="800" style={styles.bonusSectionLabel}>지급 이력</AppText>
        <View style={styles.contractRow}>
            <AppText variant="bodyMd">7/1 · 50,000원</AppText>
            <AppBadge label="즉시 현금" tone="success" />
        </View>
    </ScreenContainer>
);

const MANAGED_STORES_FIXTURE: ManagedStore[] = [{
    storeId: 1, storeName: '굿모닝분식 서초점',
    permissions: ['ATTENDANCE_APPROVE', 'SCHEDULE_MANAGE', 'TIMEOFF_APPROVE', 'STAFF_VIEW', 'DASHBOARD_VIEW'],
    delegationVersion: 2, acceptedAt: '2026-07-01T00:00:00', signatureEnvelopeId: null,
    signatureStatus: 'VERIFIED', active: true,
}];

type SubmissionSuccessKind = 'correction' | 'time-off' | 'join-store';

const SUBMISSION_SUCCESS_SPECS: Record<SubmissionSuccessKind, {
    header: string;
    title: string;
    description: string;
    primary: string;
}> = {
    correction: {
        header: '정정 요청', title: '정정 요청을 보냈어요',
        description: '사장님이 승인하면 기록에 반영됩니다.', primary: '근무 기록으로',
    },
    'time-off': {
        header: '휴가 신청', title: '휴가 신청을 보냈어요',
        description: '승인 결과는 알림으로 알려드릴게요.', primary: '내 정보로 돌아가기',
    },
    'join-store': {
        header: '매장 가입', title: '카페 소담에\n가입했어요',
        description: '오늘부터 출퇴근 기록과 급여명세를 확인할 수 있어요. 기존 매장 기록은 그대로예요.', primary: '출근 화면으로',
    },
};

const NativeReferenceSubmissionSuccess: React.FC<{kind: SubmissionSuccessKind}> = ({kind}) => {
    const c = useThemeColors();
    const spec = SUBMISSION_SUCCESS_SPECS[kind];
    return (
        <ScreenContainer header={<AppHeader title={spec.header} rightText="닫기" onRightText={() => undefined} />}>
            <View style={styles.stateCenter}>
                <View style={styles.stateInner}>
                    <View style={[styles.stateMark, {backgroundColor: c.successBg}]}>
                        <Text style={[styles.stateMarkText, {color: c.success}]}>✓</Text>
                    </View>
                    <Text style={[styles.stateTitle, {color: c.textPrimary}]}>{spec.title}</Text>
                    <Text style={[styles.stateCopy, {color: c.textSecondary}]}>{spec.description}</Text>
                    <AppButton label={spec.primary} onPress={() => undefined} style={styles.stateCta} />
                </View>
            </View>
        </ScreenContainer>
    );
};

const ActualSubmissionSuccess: React.FC<{kind: SubmissionSuccessKind}> = ({kind}) => {
    if (kind === 'correction') {
        return <AttendanceCorrectionRequestScreen visualFixture={{submitted: true}} />;
    }
    if (kind === 'time-off') {
        return <TimeOffRequestScreen visualFixture={{submitted: true}} />;
    }
    return <JoinStoreByCodeScreen visualFixture={{joinedStore: '카페 소담'}} />;
};

const SALARY_LIST_FIXTURE: SalaryListFixture = {
    stores: [{id: 101, name: '카페 소담'}],
    summaryLabel: '5월 정산 예상',
    summarySub: '정산 준비율 83% · 누락 2건',
    rows: [
        {payrollId: 1, employeeId: 1, employeeName: '민지', storeId: 101, totalHours: 80, totalPay: 934122, status: 'DRAFT', period: {startDate: '2026-05-01', endDate: '2026-05-31'}},
        {payrollId: 2, employeeId: 2, employeeName: '도윤', storeId: 101, totalHours: 72, totalPay: 821400, status: 'CONFIRMED', period: {startDate: '2026-05-01', endDate: '2026-05-31'}},
        {payrollId: 3, employeeId: 3, employeeName: '지아', storeId: 101, totalHours: 64, totalPay: 662478, status: 'PAID', period: {startDate: '2026-05-01', endDate: '2026-05-31'}},
    ],
};

const NativeReferenceSalaryList: React.FC = () => {
    const c = useThemeColors();
    return (
        <ScreenContainer
        padded={false}
        header={<AppHeader title="급여" />}
        footer={<CtaStack bordered><AppButton label="급여 정산 시작" onPress={() => undefined} /><AppButton label="과거 내역 보기" variant="outline" onPress={() => undefined} /></CtaStack>}>
        <View style={[styles.salaryCanvas, {backgroundColor: c.surfaceCanvas}]}>
            <View style={styles.salaryStorePicker}>
                <SegmentedControl options={['카페 소담']} value={0} onChange={() => undefined} />
            </View>
            <ScrollView contentContainerStyle={styles.salaryListContent} showsVerticalScrollIndicator={false}>
                <MoneyCard label="5월 정산 예상" value="2,418,000원" sub="정산 준비율 83% · 누락 2건" style={styles.salaryHeroBlock} />
                <SalaryFixtureCard name="민지" status="준비 중" statusTone="warning" hours={80} amount="934,122원" />
                <SalaryFixtureCard name="도윤" status="확정" statusTone="success" hours={72} amount="821,400원" />
                <SalaryFixtureCard name="지아" status="지급 완료" statusTone="success" hours={64} amount="662,478원" />
            </ScrollView>
        </View>
        </ScreenContainer>
    );
};

const SalaryFixtureCard: React.FC<{name: string; status: string; statusTone: 'warning' | 'success'; hours: number; amount: string}> = ({name, status, statusTone, hours, amount}) => (
    <AppCard variant="plain" style={styles.salaryCard} onPress={() => undefined}>
        <View style={styles.salaryCardTop}>
            <AppText variant="titleMd" numberOfLines={1} style={styles.salaryName}>{name}</AppText>
            <AppBadge label={status} tone={statusTone} />
        </View>
        <View style={styles.salaryCardBottom}>
            <View style={styles.salaryMeta}>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>2026-05-01 ~ 2026-05-31</AppText>
                <AppText variant="caption" tone="tertiary">총 근무 {hours}h</AppText>
            </View>
            <AmountText size={24} tone="primary" style={styles.salaryAmount}>{amount}</AmountText>
        </View>
    </AppCard>
);

type ReferenceRoleOption = {
    label: string;
    hint: string;
    ctaLabel: string;
    recommended?: boolean;
};

const REFERENCE_ROLE_OPTIONS: readonly ReferenceRoleOption[] = [
    {label: '사장님', hint: '미출근, 급여, 직원 초대', ctaLabel: '사장님으로 시작하기', recommended: true},
    {label: '직원', hint: '출근, 퇴근, 급여명세', ctaLabel: '직원으로 시작하기'},
    {label: '개인 기록', hint: '내 알바 시간 직접 기록', ctaLabel: '개인 기록 시작하기'},
] as const;

const NativeReferenceRoleStart: React.FC = () => {
    const selectedOption = REFERENCE_ROLE_OPTIONS[0];

    return (
        <LinearGradient
            colors={['#1E1A33', '#17151F', '#1C1712']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <View style={styles.roleBody}>
                    <Brandmark size={42} style={styles.roleMark} />
                    <AppText variant="headingMd" tone="inverse" style={styles.roleTitle}>
                        {'오늘 가게 운영,\n여기서 끝내세요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.roleCopy}>
                        출퇴근부터 급여명세까지 사장님과 직원이 같은 기록을 봅니다.
                    </AppText>
                    <View style={styles.roleList}>
                        {REFERENCE_ROLE_OPTIONS.map((option, index) => {
                            const isSelected = index === 0;
                            return (
                                <Pressable
                                    key={option.label}
                                    accessibilityRole="radio"
                                    accessibilityState={{selected: isSelected}}
                                    accessibilityLabel={`${option.label} 역할 선택`}
                                    style={[styles.roleCard, isSelected && styles.roleCardSelected]}>
                                    <View style={styles.roleCardText}>
                                        <AppText variant="titleMd" tone="inverse" weight="700">
                                            {option.label}
                                        </AppText>
                                        <AppText variant="caption" tone="inverse" style={styles.roleHint}>
                                            {option.hint}
                                        </AppText>
                                    </View>
                                    {option.recommended ? (
                                        <View style={styles.roleRecommendBadge}>
                                            <AppText variant="caption" weight="800" style={styles.roleRecommendText}>
                                                추천
                                            </AppText>
                                        </View>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
                <View style={styles.roleFooter}>
                    <AppButton label={selectedOption.ctaLabel} onPress={() => undefined} testID="role-start-cta" />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const NativeReferenceOnboarding: React.FC = () => (
    <LinearGradient
        colors={['#1E1A33', '#17151F', '#1C1712']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={styles.onboardingSkipRow}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="온보딩 건너뛰기"
                    style={styles.onboardingSkipButton}>
                    <Text style={styles.onboardingSkipText}>건너뛰기</Text>
                </Pressable>
            </View>
            <View style={styles.onboardingSlide}>
                <View style={styles.onboardingIllustration}>
                    <Brandmark size={160} />
                </View>
                <Text style={styles.onboardingHeadline}>{'출근 기록을\n서로 믿게'}</Text>
                <Text style={styles.onboardingCopy}>매장 반경과 NFC 태그로 기록의 기준을 만들어요.</Text>
            </View>
            <View style={styles.onboardingIndicators}>
                <View style={[styles.onboardingDot, styles.onboardingDotActive]} />
                <View style={[styles.onboardingDot, styles.onboardingDotInactive]} />
                <View style={[styles.onboardingDot, styles.onboardingDotInactive]} />
            </View>
            <View style={styles.onboardingFooter}>
                <AppButton label="다음" onPress={() => undefined} />
            </View>
        </SafeAreaView>
    </LinearGradient>
);

const NativeReferenceKakaoLogin: React.FC = () => {
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={['#1E1A33', '#17151F', '#1C1712']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <View style={styles.kakaoCenter}>
                    <Brandmark size={64} label="K" backgroundColor="#FEE500" textColor="#1F1A0E" />
                    <AppText variant="headingLg" tone="inverse" center style={styles.kakaoTitle}>
                        {'카카오로\n간편하게 계속'}
                    </AppText>
                    <AppText variant="bodyLg" tone="inverse" center style={styles.kakaoCopy}>
                        처음 한 번만 동의하면 다음부터 바로 들어올 수 있어요.
                    </AppText>
                </View>
                <View style={[styles.kakaoFooter, {paddingBottom: Math.max(insets.bottom, 12) + 8}]}>
                    <AppButton label="카카오 동의 계속하기" variant="kakao" onPress={() => undefined} />
                    <AppButton label="이메일로 로그인" variant="ghost" onPress={() => undefined} />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const NativeReferenceSplash: React.FC = () => (
    <SafeAreaView style={styles.splashSafeArea}>
        <LinearGradient
            colors={['#1E1A33', '#17151F', '#1C1712']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.splashGradient}>
            <View style={styles.splashCenter}>
                <View>
                    <Brandmark size={64} />
                </View>
                <Text style={styles.splashBrandName}>소담</Text>
                <Text style={styles.splashSlogan}>
                    작은 가게의 오늘 할 일을 바로 끝내는 운영 비서
                </Text>
            </View>
        </LinearGradient>
    </SafeAreaView>
);

const NativeReferenceWelcomeMain: React.FC = () => (
    <LinearGradient
        colors={['#1E1A33', '#17151F', '#1C1712']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={styles.landingHeader}>
                <Text style={styles.landingHeaderTitle}>소담</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="로그인" style={styles.landingHeaderPill}>
                    <Text style={styles.landingHeaderPillText}>로그인</Text>
                </Pressable>
            </View>
            <View style={styles.landingContent}>
                <View style={styles.landingLogoZone}>
                    <Brandmark size={64} style={styles.landingBrandmark} />
                    <Text style={styles.landingTitle}>{'월말 정산이\n30분 안에 끝나요'}</Text>
                    <Text style={styles.landingTagline}>GPS·NFC 출퇴근, 자동 급여 계산, 직원 명세 확인까지 한 번에.</Text>
                </View>
                <View style={styles.landingButtons}>
                    <LandingButton label="무료로 시작하기" primary />
                    <LandingButton label="이미 계정이 있어요" />
                </View>
            </View>
        </SafeAreaView>
    </LinearGradient>
);

const LandingButton: React.FC<{label: string; primary?: boolean}> = ({label, primary = false}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.landingButton, primary ? styles.landingPrimaryButton : styles.landingOutlineButton]}>
        <View style={styles.buttonRow}>
            <Text style={styles.landingButtonText}>{label}</Text>
        </View>
    </Pressable>
);

const NativeReferenceLogin: React.FC = () => (
    <LinearGradient
        colors={['#1E1A33', '#17151F', '#1C1712']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <SodamLogo size={42} variant="default" />
                    <Text style={styles.title}>{'다시 오셨네요.\n바로 시작해요'}</Text>
                    <Text style={styles.copy}>매장 상태와 내 근무 기록을 이어서 확인합니다.</Text>
                </View>

                <View style={styles.form}>
                    <ReferenceField label="이메일" />
                    <ReferenceField label="비밀번호" secureTextEntry />
                    <ReferenceButton label="로그인" variant="primary" />
                    <ReferenceButton label="카카오로 계속" variant="kakao" />
                </View>

                <View style={styles.footerRow}>
                    <Text style={styles.footerText}>비밀번호 찾기</Text>
                    <Text style={styles.footerText}> · </Text>
                    <Text style={styles.footerText}>회원가입</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    </LinearGradient>
);

const NativeReferenceSignup: React.FC = () => (
    <StepScaffold
        progress={1 / 3}
        title="기본 정보"
        onBack={() => undefined}
        footer={
            <CtaStack bordered>
                <AppButton label="다음" onPress={() => undefined} />
            </CtaStack>
        }>
        <View style={styles.signupBadgeRow}>
            <AppBadge tone="success" label="1/3" />
        </View>
        <AppText variant="titleMd" tone="secondary" style={styles.signupSectionLabel}>
            어떤 역할인가요?
        </AppText>
        <SegmentedControl options={['사장님', '직원', '개인']} value={0} onChange={() => undefined} />
        <AppCard variant="warm" style={styles.signupHint}>
            <AppText variant="titleMd">사장님으로 시작합니다</AppText>
            <AppText variant="caption" tone="secondary" style={styles.signupHintSub}>
                매장 등록부터 직원 초대까지 이어서 준비할 수 있어요.
            </AppText>
        </AppCard>
        <View style={styles.signupForm}>
            <AppInput label="이름" placeholder="이름을 입력해 주세요" helper="실명 또는 닉네임 2자 이상" value="" onChangeText={() => undefined} />
            <View style={styles.signupEmailGroup}>
                <AppInput label="이메일" placeholder="name@example.com" value="" onChangeText={() => undefined} keyboardType="email-address" autoCapitalize="none" />
                <AppButton label="이메일 중복 확인" variant="outline" size="md" onPress={() => undefined} />
            </View>
            <AppInput label="비밀번호" placeholder="비밀번호를 입력해 주세요" helper="8자 이상, 대문자/소문자/숫자/특수문자 중 3가지 이상" value="" onChangeText={() => undefined} secureTextEntry />
        </View>
    </StepScaffold>
);

const ReferenceField: React.FC<{label: string; secureTextEntry?: boolean}> = ({label, secureTextEntry}) => (
    <View style={styles.field}>
        <TextInput
            accessibilityLabel={label}
            placeholder={label}
            placeholderTextColor="rgba(245,243,239,0.4)"
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
            autoCorrect={false}
            hitSlop={{top: 3, bottom: 3}}
            style={styles.fieldInput}
        />
    </View>
);

const ReferenceButton: React.FC<{label: string; variant: 'primary' | 'kakao'}> = ({label, variant}) => {
    const primary = variant === 'primary';
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            style={[styles.button, primary ? styles.primaryButton : styles.kakaoButton]}>
            <View style={styles.buttonRow}>
                <Text style={[styles.buttonText, primary ? styles.primaryButtonText : styles.kakaoButtonText]}>{label}</Text>
            </View>
        </Pressable>
    );
};

const VisualRouteFrame: React.FC<{source: 'reference' | 'actual'; screenId: string; children: React.ReactNode}> = ({source, screenId, children}) => (
    <View style={styles.visualRoute}>
        <Text
            accessibilityLabel={`v3-visual-${source}-${screenId}`}
            style={styles.visualRouteMarker}>
            {`v3-visual-${source}-${screenId}`}
        </Text>
        {children}
    </View>
);

const V3VisualHarnessScreen: React.FC<Props> = ({navigation, route}) => {
    const {screenId, source} = route.params;
    const visual = (content: React.ReactNode) => (
        <VisualRouteFrame source={source} screenId={screenId}>{content}</VisualRouteFrame>
    );

    if (screenId === V3_VISUAL_SCREEN_IDS.welcomeSplash) {
        if (source === 'reference') {
            return visual(<NativeReferenceSplash />);
        }
        return visual(<SplashScreen disableAnimation minDurationMs={0} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.authRoleStart) {
        if (source === 'reference') {
            return visual(<NativeReferenceRoleStart />);
        }
        return visual(<RoleStartScreen navigation={navigation as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.authOnboarding) {
        if (source === 'reference') {
            return visual(<NativeReferenceOnboarding />);
        }
        return visual(<OnboardingCarouselScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.authKakaoLogin) {
        if (source === 'reference') {
            return visual(<NativeReferenceKakaoLogin />);
        }
        return visual(<KakaoLoginScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.checkoutConfirm) {
        const sheetMarker = `v3-visual-${source}-${screenId}`;
        if (source === 'reference') {
            return visual(<NativeReferenceCheckoutConfirm captureMarker={sheetMarker} />);
        }
        return visual(<ActualCheckoutConfirm captureMarker={sheetMarker} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.breakTimerSheet) {
        return visual(<VisualBreakTimerSheet captureMarker={`v3-visual-${source}-${screenId}`} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.manualRecordSheet) {
        return visual(<VisualManualRecordSheet captureMarker={`v3-visual-${source}-${screenId}`} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.personalRecordEdit) {
        const sheetMarker = `v3-visual-${source}-${screenId}`;
        if (source === 'reference') {
            return visual(<NativeReferencePersonalRecordEdit captureMarker={sheetMarker} />);
        }
        return visual(<ActualPersonalRecordEdit captureMarker={sheetMarker} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.payrollPdfPreview) {
        if (source === 'reference') {
            return visual(<NativeReferencePdfPreview />);
        }
        return visual(<PdfPreviewScreen visualFixture={PDF_PREVIEW_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.salaryDetail) {
        if (source === 'reference') {
            return visual(<NativeReferenceSalaryDetail />);
        }
        return visual(<SalaryDetailScreen visualFixture={SALARY_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.payrollCalculationDetail) {
        const sheetMarker = `v3-visual-${source}-${screenId}`;
        if (source === 'reference') {
            return visual(<NativeReferencePayrollCalculationDetail captureMarker={sheetMarker} />);
        }
        return visual(
            <PayrollCalculationDetailModal
                visible
                onClose={() => undefined}
                summary={SALARY_DETAIL_SUMMARY}
                items={SALARY_DETAIL_ITEMS}
                captureMarker={sheetMarker}
            />,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.payrollRun) {
        return visual(<PayrollRunScreen visualFixture={PAYROLL_RUN_PREVIEW_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.payrollIssueConfirm) {
        return visual(<PayrollRunScreen visualFixture={PAYROLL_RUN_CONFIRM_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.payrollIssueSuccess) {
        return visual(<PayrollRunScreen visualFixture={PAYROLL_RUN_DONE_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.subscribe) {
        // 플랜 카드 리스트가 많아 30/68/69와 같은 이유로 reference/actual 양쪽 다 실제 컴포넌트를 재사용.
        return visual(<SubscribeScreen visualFixture={SUBSCRIBE_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.billingMethod) {
        const sheetMarker = `v3-visual-${source}-${screenId}`;
        if (source === 'reference') {
            return visual(<NativeReferenceBillingMethod captureMarker={sheetMarker} />);
        }
        return visual(
            <BillingMethodSheet
                visible
                onClose={() => undefined}
                currentMethod="카드 ****4821"
                nextBillingDate="2026.06.25"
                onManageViaToss={() => undefined}
                captureMarker={sheetMarker}
            />,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.planDetail) {
        const sheetMarker = `v3-visual-${source}-${screenId}`;
        if (source === 'reference') {
            return visual(<NativeReferencePlanDetail captureMarker={sheetMarker} />);
        }
        return visual(
            <PlanDetailSheet
                visible
                onClose={() => undefined}
                view={PLAN_DETAIL_VIEW_FIXTURE}
                onSelect={() => undefined}
                captureMarker={sheetMarker}
            />,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.infoList) {
        return visual(<InfoListScreen visualFixture={{categories: INFO_CATEGORIES_FIXTURE, articles: [...INFO_ARTICLES_FIXTURE]}} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.laborInfoDetail) {
        return visual(<LaborInfoDetailScreen visualFixture={LABOR_INFO_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.policyDetail) {
        return visual(<PolicyDetailScreen visualFixture={POLICY_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.taxInfoDetail) {
        return visual(<TaxInfoDetailScreen visualFixture={TAX_INFO_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.tipsDetail) {
        return visual(<TipsDetailScreen visualFixture={TIPS_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.qna) {
        return visual(<QnAScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.qnaCompose) {
        // QnAScreen 자체 헤더 "글쓰기"로 여는 BottomSheet가 73 QnACompose — 별도 화면 없음.
        return visual(<QnAScreen visualComposeOpen captureMarker={`v3-visual-${source}-${screenId}`} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.legalWebview) {
        return visual(<LegalWebviewScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.notificationCenter) {
        return visual(<NotificationCenterScreen visualFixture={NOTIFICATION_CENTER_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.settingsHub || screenId === V3_VISUAL_SCREEN_IDS.myPage) {
        // 39 Settings + 41 MyPage(구독 항목) — SettingsScreen 하나가 두 카드를 모두 커버.
        return visual(<SettingsScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.notificationSettings) {
        return visual(<NotificationSettingsScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.accountSettings) {
        return visual(<AccountSettingsScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.profile) {
        return visual(<ProfileScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.referral) {
        return visual(<ReferralScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.logoutConfirm) {
        return visual(<VisualLogoutConfirm captureMarker={`v3-visual-${source}-${screenId}`} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.accountDeleteFlow) {
        return visual(<AccountSettingsScreen visualWithdrawOpen captureMarker={`v3-visual-${source}-${screenId}`} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.imagePickerSheet) {
        return visual(
            <ImagePickerSheet
                visible
                onClose={() => undefined}
                onCamera={() => undefined}
                onAlbum={() => undefined}
                onReset={() => undefined}
                captureMarker={`v3-visual-${source}-${screenId}`}
            />,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.toastExamples) {
        return visual(<VisualToastExamples />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.componentRules) {
        return visual(<VisualComponentRules />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.recruitmentHub) {
        return visual(<EmployeeRecruitmentScreen visualInitialTab="nearby" visualNearbyFixture={RECRUITMENT_NEARBY_LIST_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.jobOfferInbox) {
        return visual(
            <ScreenContainer header={<AppHeader title="채용함" />}>
                <JobOfferInboxScreen visualFixture={RECRUITMENT_OFFER_INBOX_FIXTURE} />
            </ScreenContainer>,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.jobPostingDetail) {
        return visual(<JobPostingDetailScreen visualFixture={{posting: RECRUITMENT_POSTING_FIXTURE}} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.jobSeekerDetail) {
        return visual(<JobSeekerDetailScreen visualFixture={{storeId: 1, seeker: RECRUITMENT_SEEKER_FIXTURE}} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.jobSeekerList) {
        return visual(<JobSeekerListScreen visualStoreId={1} visualFixture={RECRUITMENT_SEEKER_LIST_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.jobSeekingSettings) {
        return visual(
            <ScreenContainer scroll header={<AppHeader title="구직 설정" />}>
                <JobSeekingSettingsScreen visualFixture={RECRUITMENT_JOB_SEEKING_PROFILE_FIXTURE} />
            </ScreenContainer>,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.nearbyJobPostings) {
        return visual(
            <ScreenContainer scroll header={<AppHeader title="주변 채용 공고" />}>
                <NearbyJobPostingsScreen onGoToProfileTab={() => undefined} visualFixture={RECRUITMENT_NEARBY_LIST_FIXTURE} />
            </ScreenContainer>,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.ourPosting) {
        return visual(
            <ScreenContainer scroll header={<AppHeader title="구인 공고" />}>
                <OurPostingScreen storeId={1} visualApplicantsFixture={RECRUITMENT_APPLICANTS_FIXTURE} />
            </ScreenContainer>,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.contractSign) {
        return visual(<ContractSignScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.draftContracts) {
        return visual(<DraftContractsScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.myContract) {
        return visual(<MyContractScreen visualAutoSelectFirst />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.sendContract) {
        // ⛔ 노무사 게이트(protected-readonly) — SendContractScreen.tsx 무수정, 독립 전사만.
        return visual(<VisualSendContractStep3 />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.addDocument) {
        return visual(<AddDocumentScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.employeeDocuments) {
        return visual(<EmployeeDocumentsScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.electronicSignProgress) {
        // ⛔ 노무사 게이트(protected-readonly) — ElectronicSignScreen.tsx 무수정, 독립 전사만.
        return visual(<VisualElectronicSignProgress />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.evidencePackage) {
        return visual(<EvidencePackageScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.myCertificate) {
        return visual(<MyCertificateScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.minorGuard) {
        return visual(<MinorGuardScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.purchaseLedger) {
        return visual(<PurchaseLedgerScreen route={{params: {storeId: 1}} as any} navigation={navigation as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.purchaseScan) {
        return visual(<PurchaseScanScreen route={{params: {storeId: 1}} as any} navigation={navigation as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.purchaseConfirm) {
        return visual(<PurchaseConfirmScreen route={{params: {storeId: 1}} as any} navigation={navigation as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.priceTrend) {
        return visual(<PriceTrendScreen route={{params: {storeId: 1}} as any} navigation={navigation as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.reorderHint) {
        return visual(<ReorderHintScreen route={{params: {storeId: 1}} as any} navigation={navigation as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.dailySalesEntry) {
        return visual(<DailySalesEntryScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.laborCostRatio) {
        return visual(<LaborCostRatioScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.weeklyInsights) {
        return visual(<WeeklyInsightsScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.subsidyEligibility) {
        return visual(<SubsidyEligibilityScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.hiringCostSimulator) {
        return visual(<HiringCostSimulatorScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.laborRiskDashboard) {
        return visual(<LaborRiskDashboardScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.payrollPreview) {
        return visual(<PayrollPreviewScreen visualFixture={PAYROLL_PREVIEW_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.salaryArchive) {
        return visual(<SalaryArchiveScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.taxDeadline) {
        return visual(<TaxDeadlineScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.taxSimulator) {
        return visual(<TaxSimulatorScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.taxReport) {
        return visual(<TaxReportScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.withholdingStatement) {
        return visual(<WithholdingStatementScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.myWageHistory) {
        return visual(<MyWageHistoryScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.headcountTrend) {
        return visual(<HeadcountTrendScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.legalLedger) {
        return visual(<LegalLedgerScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.storeNoticeList) {
        return visual(<StoreNoticeListScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.writeNotice) {
        return visual(<WriteNoticeScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.myNotice) {
        return visual(<MyNoticeScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.requestStatus) {
        return visual(<RequestStatusScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.managerAppoint) {
        return visual(
            <ScreenContainer scroll header={<AppHeader title="매니저 권한 위임" />}>
                <ManagerAppointSection
                    storeId={1}
                    employeeId={3}
                    employeeName="이현수"
                    navigation={navigation as any}
                />
            </ScreenContainer>,
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.employeeMyPage) {
        return visual(<EmployeeMyPageRNScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.managerMyPage) {
        return visual(<ManagerMyPageScreen visualFixture={MANAGED_STORES_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.sendBonus) {
        // ⛔ 노무사 게이트(protected-readonly) — SendBonusScreen.tsx 무수정, 독립 전사만.
        return visual(<VisualSendBonus />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.personalAnnualTax) {
        return visual(<PersonalAnnualTaxScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.breakRecord) {
        return visual(<BreakRecordScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.consent) {
        return visual(<ConsentScreen navigation={navigation as any} route={{params: {}} as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.profileBasics) {
        return visual(<ProfileBasicsScreen navigation={navigation as any} route={{params: {}} as any} />);
    }

    const commonStateIds: Record<string, CommonStateKind> = {
        [V3_VISUAL_SCREEN_IDS.commonEmpty]: 'empty',
        [V3_VISUAL_SCREEN_IDS.commonError]: 'error',
        [V3_VISUAL_SCREEN_IDS.commonPermission]: 'permission',
        [V3_VISUAL_SCREEN_IDS.commonLoading]: 'loading',
    };
    const commonState = commonStateIds[screenId];
    if (commonState) {
        return visual(source === 'reference'
            ? <NativeReferenceCommonState kind={commonState} />
            : <ActualCommonState kind={commonState} />);
    }

    const opsStateIds: Record<string, 'operating-hours' | 'nfc-tags' | 'employee-management' | 'billing-processing'> = {
        [V3_VISUAL_SCREEN_IDS.opsOperatingHours]: 'operating-hours',
        [V3_VISUAL_SCREEN_IDS.opsNfcTags]: 'nfc-tags',
        [V3_VISUAL_SCREEN_IDS.opsEmployeeManagement]: 'employee-management',
        [V3_VISUAL_SCREEN_IDS.opsBillingProcessing]: 'billing-processing',
    };
    const opsState = opsStateIds[screenId];
    if (opsState) {
        if (source === 'reference') {
            if (opsState === 'operating-hours') {
                return visual(<NativeReferenceOperatingHours />);
            }
            if (opsState === 'nfc-tags') {
                return visual(<NativeReferenceNfcTags />);
            }
            if (opsState === 'employee-management') {
                return visual(<NativeReferenceEmployeeManagement />);
            }
            return visual(<NativeReferenceBillingProcessing />);
        }
        if (opsState === 'operating-hours') {
            return visual(<StoreOperatingHoursScreen visualFixture={OPERATING_HOURS_FIXTURE} />);
        }
        if (opsState === 'nfc-tags') {
            return visual(
                <NfcTagManagementScreen
                    route={{key: 'v3-visual-nfc-tags', name: 'NfcTagManagement', params: {storeId: 101}} as any}
                    navigation={navigation as any}
                    visualFixture={NFC_TAGS_FIXTURE}
                />,
            );
        }
        if (opsState === 'employee-management') {
            return visual(
                <EmployeeManagementScreen
                    route={{key: 'v3-visual-employee-management', name: 'EmployeeManagement', params: {storeId: 101}} as any}
                    navigation={navigation as any}
                    visualFixture={EMPLOYEE_MANAGEMENT_FIXTURE}
                />,
            );
        }
        return visual(<TossBillingAuthScreen visualFixture={{processing: true}} />);
    }

    const scheduleStateIds: Record<string, 'edit-shift' | 'my-shift' | 'store-schedule' | 'swap-board' | 'swap-requests' | 'time-off-approval' | 'leave-balance' | 'attendance-approval' | 'attendance-irregularities' | 'attendance-notice' | 'employee-work-log'> = {
        [V3_VISUAL_SCREEN_IDS.scheduleEditShift]: 'edit-shift',
        [V3_VISUAL_SCREEN_IDS.scheduleMyShift]: 'my-shift',
        [V3_VISUAL_SCREEN_IDS.scheduleStoreSchedule]: 'store-schedule',
        [V3_VISUAL_SCREEN_IDS.scheduleSwapBoard]: 'swap-board',
        [V3_VISUAL_SCREEN_IDS.scheduleSwapRequests]: 'swap-requests',
        [V3_VISUAL_SCREEN_IDS.scheduleTimeOffApproval]: 'time-off-approval',
        [V3_VISUAL_SCREEN_IDS.scheduleLeaveBalance]: 'leave-balance',
        [V3_VISUAL_SCREEN_IDS.scheduleAttendanceApproval]: 'attendance-approval',
        [V3_VISUAL_SCREEN_IDS.scheduleAttendanceIrregularities]: 'attendance-irregularities',
        [V3_VISUAL_SCREEN_IDS.scheduleAttendanceNotice]: 'attendance-notice',
        [V3_VISUAL_SCREEN_IDS.scheduleEmployeeWorkLog]: 'employee-work-log',
    };
    const scheduleState = scheduleStateIds[screenId];
    if (scheduleState) {
        if (source === 'reference') {
            if (scheduleState === 'edit-shift') {
                return visual(<NativeReferenceEditShift />);
            }
            if (scheduleState === 'my-shift') {
                return visual(<NativeReferenceMyShift />);
            }
            if (scheduleState === 'store-schedule') {
                return visual(<NativeReferenceStoreSchedule />);
            }
            if (scheduleState === 'swap-board') {
                return visual(<NativeReferenceSwapBoard />);
            }
            if (scheduleState === 'swap-requests') {
                return visual(<NativeReferenceSwapRequests />);
            }
            if (scheduleState === 'attendance-approval') {
                return visual(<NativeReferenceAttendanceApproval />);
            }
            if (scheduleState === 'attendance-irregularities') {
                return visual(<NativeReferenceAttendanceIrregularities />);
            }
            if (scheduleState === 'employee-work-log') {
                return visual(<NativeReferenceEmployeeWorkLog />);
            }
            if (scheduleState === 'time-off-approval') {
                return visual(<NativeReferenceTimeOffApproval />);
            }
            return visual(scheduleState === 'leave-balance'
                ? <NativeReferenceLeaveBalance />
                : <NativeReferenceAttendanceNotice />);
        }
        if (scheduleState === 'edit-shift') {
            return visual(<EditShiftScreen visualFixture={EDIT_SHIFT_FIXTURE} />);
        }
        if (scheduleState === 'my-shift') {
            return visual(<MyShiftScreen visualFixture={MY_SHIFT_FIXTURE} />);
        }
        if (scheduleState === 'store-schedule') {
            return visual(
                <StoreScheduleScreen
                    route={{key: 'v3-visual-store-schedule', name: 'StoreSchedule', params: {storeId: 101}} as any}
                    navigation={navigation as any}
                    visualFixture={STORE_SCHEDULE_FIXTURE}
                />,
            );
        }
        if (scheduleState === 'swap-board') {
            return visual(<SwapBoardScreen visualFixture={SWAP_BOARD_FIXTURE} />);
        }
        if (scheduleState === 'swap-requests') {
            return visual(
                <SwapRequestsScreen
                    visualFixture={SWAP_REQUESTS_FIXTURE}
                />,
            );
        }
        if (scheduleState === 'attendance-approval') {
            return visual(
                <AttendanceApprovalScreen
                    route={{key: 'v3-visual-attendance-approval', name: 'AttendanceApproval', params: {storeId: 101}} as any}
                    navigation={navigation as any}
                    visualFixture={ATTENDANCE_APPROVAL_FIXTURE}
                />,
            );
        }
        if (scheduleState === 'attendance-irregularities') {
            return visual(<AttendanceIrregularitiesScreen visualFixture={ATTENDANCE_IRREGULARITIES_FIXTURE} />);
        }
        if (scheduleState === 'employee-work-log') {
            return visual(<EmployeeWorkLogScreen visualFixture={EMPLOYEE_WORK_LOG_FIXTURE} />);
        }
        if (scheduleState === 'time-off-approval') {
            return visual(<TimeOffApprovalScreen visualFixture={TIME_OFF_APPROVAL_FIXTURE} />);
        }
        return visual(scheduleState === 'leave-balance'
            ? <MyLeaveBalanceScreen visualFixture={LEAVE_BALANCE_FIXTURE} />
            : <AttendanceNoticeScreen visualFixture={ATTENDANCE_NOTICE_FIXTURE} />);
    }

    const serviceStateIds: Record<string, ServiceStateKind> = {
        [V3_VISUAL_SCREEN_IDS.opsAppUpdate]: 'update',
        [V3_VISUAL_SCREEN_IDS.opsMaintenance]: 'maintenance',
        [V3_VISUAL_SCREEN_IDS.opsPaymentSuccess]: 'payment-success',
    };
    const serviceState = serviceStateIds[screenId];
    if (serviceState) {
        if (source === 'reference') {
            return visual(<NativeReferenceServiceState kind={serviceState} />);
        }
        if (serviceState === 'update') {
            return visual(<AppUpdateScreen currentVersion="3.2.0" storeUrl="https://example.com" />);
        }
        if (serviceState === 'maintenance') {
            return visual(<MaintenanceScreen onRetry={() => undefined} />);
        }
        return visual(<PaymentSuccessScreen onDone={() => undefined} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.opsSubscriptionGate) {
        return visual(source === 'reference'
            ? <NativeReferenceSubscriptionGate />
            : <SubscriptionGateScreen featureName="급여명세 발급" onPrimary={() => undefined} onSecondary={() => undefined} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.opsPushPrimer) {
        const captureMarker = `v3-visual-${source}-${screenId}`;
        return visual(source === 'reference'
            ? <NativeReferencePushPrimer captureMarker={captureMarker} />
            : <VisualSheetBase><PushPrimerSheet visible onAllow={() => undefined} onLater={() => undefined} captureMarker={captureMarker} /></VisualSheetBase>);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.employeeHome) {
        return visual(source === 'reference' ? <NativeReferenceEmployeeHome /> : <HomeScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.employeeAttendanceHomeMulti) {
        return visual(<EmployeeAttendanceHome visualFixture={EMPLOYEE_ATTENDANCE_HOME_IDLE_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.employeeWorking) {
        return visual(<EmployeeAttendanceHome visualFixture={EMPLOYEE_ATTENDANCE_HOME_WORKING_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.ownerHome) {
        return visual(<OwnerDashboardContent visualFixture={OWNER_HOME_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.managerHome) {
        return visual(<ManagerDashboardContent storeId={101} visualFixture={MANAGER_HOME_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.ownerDashboardDetail) {
        return visual(<OwnerDashboardDetailScreen visualFixture={OWNER_DASHBOARD_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.storeList) {
        return visual(<StoreListScreen visualFixture={STORE_LIST_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.storeRegistration) {
        return visual(<StoreRegistrationScreen visualFixture={STORE_REGISTRATION_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.storeDetail) {
        return visual(
            <StoreDetailScreen
                navigation={navigation as any}
                route={{key: 'v3-visual-store-detail', name: 'StoreDetail', params: {storeId: 101}} as any}
                visualFixture={STORE_DETAIL_FIXTURE}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.storeEdit) {
        return visual(<StoreEditScreen visualFixture={STORE_EDIT_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.workplaceList) {
        return visual(<WorkplaceListScreen visualFixture={WORKPLACE_LIST_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.workplaceDetail) {
        return visual(<WorkplaceDetailScreen visualFixture={WORKPLACE_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.employeeDetail) {
        return visual(<EmployeeDetailScreen visualFixture={EMPLOYEE_DETAIL_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.wageSettings) {
        return visual(<WageSettingsScreen visualFixture={WAGE_SETTINGS_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.masterMyPage) {
        return visual(<MasterMyPageScreen navigation={navigation as any} visualFixture={MASTER_MY_PAGE_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.attendanceCalendar) {
        return visual(<AttendanceCalendarScreen visualFixture={ATTENDANCE_CALENDAR_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.missingAttendanceCenter) {
        return visual(<MissingAttendanceCenterScreen visualFixture={MISSING_ATTENDANCE_CENTER_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.personalHome) {
        return visual(<PersonalUserScreen visualFixture={PERSONAL_HOME_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.attendanceFilterSheet) {
        return visual(
            <AttendanceFilterSheet
                visible
                onClose={() => undefined}
                onApply={() => undefined}
                captureMarker={`v3-visual-${source}-${screenId}`}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.nfcScanModal) {
        return visual(
            <AttendanceScreen
                visualFixture={{
                    ...ATTENDANCE_AUTHENTICATION_FIXTURE,
                    checkInMethod: 'nfc',
                    forceShowNfcReader: true,
                    captureMarker: `v3-visual-${source}-${screenId}`,
                }}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.attendanceOverview) {
        return visual(source === 'reference'
            ? <NativeReferenceAttendanceOverview />
            : <AttendanceOverviewScreen fixture={ATTENDANCE_OVERVIEW_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.attendanceAuthentication) {
        // 실 AttendanceScreen이 이미 v3 DS(AppCard/AppText/SegmentedControl)로 구현되어 있고,
        // 목업 #20은 그 화면의 한 상태(위치 인증)를 고립시켜 그린 것일 뿐 별도 라우트가 아니다.
        // 손으로 다시 옮겨 그린 참조본은 실 화면이 진화할 때마다 조용히 어긋나므로(이번 회귀의 원인),
        // 양쪽 모두 동일한 실 컴포넌트+동일 fixture를 렌더링해 항상 동기화되도록 한다.
        return visual(<AttendanceScreen visualFixture={ATTENDANCE_AUTHENTICATION_FIXTURE} />);
    }

    const attendanceStateIds: Record<string, AttendanceStateKind> = {
        [V3_VISUAL_SCREEN_IDS.nfcUnsupported]: 'nfc-unsupported',
        [V3_VISUAL_SCREEN_IDS.punchSuccess]: 'punch-success',
        [V3_VISUAL_SCREEN_IDS.punchFailedRadius]: 'punch-failed',
    };
    const attendanceState = attendanceStateIds[screenId];
    if (attendanceState) {
        return visual(source === 'reference'
            ? <NativeReferenceAttendanceState kind={attendanceState} />
            : <ActualAttendanceState kind={attendanceState} />);
    }

    const submissionSuccessIds: Record<string, SubmissionSuccessKind> = {
        [V3_VISUAL_SCREEN_IDS.correctionSuccess]: 'correction',
        [V3_VISUAL_SCREEN_IDS.timeOffSuccess]: 'time-off',
        [V3_VISUAL_SCREEN_IDS.joinStoreSuccess]: 'join-store',
    };
    const submissionSuccess = submissionSuccessIds[screenId];
    if (submissionSuccess) {
        return visual(source === 'reference'
            ? <NativeReferenceSubmissionSuccess kind={submissionSuccess} />
            : <ActualSubmissionSuccess kind={submissionSuccess} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.salaryList) {
        return visual(source === 'reference' ? <NativeReferenceSalaryList /> : <SalaryListScreen fixture={SALARY_LIST_FIXTURE} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.authWelcomeMain) {
        if (source === 'reference') {
            return visual(<NativeReferenceWelcomeMain />);
        }
        return visual(<SodamLandingScreen navigation={navigation as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.authLogin) {
        if (source === 'reference') {
            return visual(<NativeReferenceLogin />);
        }
        // This is the actual service component, not a reference image or a
        // simulated form. The harness only supplies ordinary stack props.
        return visual(
            <LoginScreen
                navigation={navigation as any}
                route={{key: 'v3-visual-login', name: 'Login', params: undefined} as any}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.authSignup) {
        if (source === 'reference') {
            return visual(<NativeReferenceSignup />);
        }
        return visual(
            <SignupScreen
                navigation={navigation as any}
                route={{key: 'v3-visual-signup', name: 'Signup', params: undefined} as any}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.passwordReset) {
        return visual(<PasswordResetScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.termsSheet) {
        // 51 TermsSheet 카드는 N11(약관 동의)과 동일한 실 화면을 가리키는 중복 카탈로그 항목이다.
        return visual(<ConsentScreen navigation={navigation as any} route={{params: {}} as any} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.attendanceCorrectionRequest) {
        return visual(<AttendanceCorrectionRequestScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.timeOffRequestForm) {
        return visual(<TimeOffRequestScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.joinStoreByCode) {
        return visual(<JoinStoreByCodeScreen />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.storeSwitcherSheet) {
        return visual(
            <StoreSwitcherSheet
                stores={[
                    {id: 101, storeName: '카페 소담', subtitle: '홍대점'},
                    {id: 102, storeName: '소담 베이커리', subtitle: '연남점'},
                ]}
                selectedId={101}
                onSelect={() => undefined}
                onRegisterNew={() => undefined}
                visualForceOpen
                captureMarker={`v3-visual-${source}-${screenId}`}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.addressSearchSheet) {
        return visual(<VisualAddressSearchSheet captureMarker={`v3-visual-${source}-${screenId}`} />);
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.radiusSelectorSheet) {
        return visual(
            <RadiusSelectorSheet
                visible
                onClose={() => undefined}
                value={1}
                onApply={() => undefined}
                captureMarker={`v3-visual-${source}-${screenId}`}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.inviteShareSheet) {
        return visual(
            <InviteShareSheet
                visible
                onClose={() => undefined}
                code="CAFE-4821"
                onShareKakao={() => undefined}
                onShareSms={() => undefined}
                onCopy={() => undefined}
                captureMarker={`v3-visual-${source}-${screenId}`}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.employeeActionSheet) {
        return visual(
            <EmployeeActionSheet
                visible
                onClose={() => undefined}
                employeeName="김민지"
                onWage={() => undefined}
                onMemo={() => undefined}
                onDeactivate={() => undefined}
                captureMarker={`v3-visual-${source}-${screenId}`}
            />
        );
    }

    if (screenId === V3_VISUAL_SCREEN_IDS.wageEditSheet) {
        return visual(
            <WageEditSheet
                visible
                onClose={() => undefined}
                employeeName="김민지"
                initialEmploymentType="HOURLY"
                initialMonthlySalary={0}
                initialSocialInsuranceEnrolled={null}
                onSave={() => undefined}
                captureMarker={`v3-visual-${source}-${screenId}`}
            />
        );
    }

    return visual(
        <View style={styles.unsupported} accessibilityLabel="미배선 v3 시각 정본">
            <Text style={styles.unsupportedTitle}>미배선 정본 화면</Text>
            <Text style={styles.unsupportedCopy}>{screenId}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    addressSearchList: {gap: spacing.xs, marginTop: spacing.sm},
    addressSearchCta: {marginTop: spacing.md},
    toastExampleNote: {marginTop: spacing.xs},
    toastExampleToast: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#15171B',
    },
    componentRulesList: {gap: spacing.md},
    componentRulesRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    componentRulesDot: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: '#12B8A6',
        alignItems: 'center', justifyContent: 'center',
    },
    contractStepsRow: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg},
    contractStepDotWrap: {flexDirection: 'row', alignItems: 'center', flex: 1},
    contractStepDot: {
        width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#E7E7E2',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    },
    contractStepDotDone: {backgroundColor: '#12B8A6', borderColor: '#12B8A6'},
    contractStepDotActive: {backgroundColor: '#FF4D6D', borderColor: '#FF4D6D'},
    contractStepDotTextOn: {color: '#fff'},
    contractStepLine: {flex: 1, height: 2, backgroundColor: '#E7E7E2'},
    contractStepLineDone: {backgroundColor: '#12B8A6'},
    contractSectionLabel: {marginTop: spacing.lg, marginBottom: spacing.sm},
    contractField: {marginTop: spacing.md},
    contractRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm},
    contractInfoCard: {marginTop: spacing.md, gap: spacing.xs},
    contractNextBtn: {marginTop: spacing.xl},
    esignContent: {padding: spacing.xxl, gap: spacing.xxl},
    esignCardTitle: {marginTop: spacing.xs},
    esignMutedInverse: {marginTop: spacing.sm, opacity: 0.82},
    esignSection: {gap: spacing.sm},
    esignRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    esignDescription: {marginTop: spacing.sm, lineHeight: 22},
    esignAction: {marginTop: spacing.lg},
    bonusEmployeeName: {marginTop: spacing.xs, marginBottom: spacing.md},
    bonusInfoCard: {marginBottom: spacing.lg},
    bonusField: {marginBottom: spacing.md},
    bonusCta: {marginTop: spacing.lg, marginBottom: spacing.xl},
    bonusSectionLabel: {marginBottom: spacing.sm},
    visualRoute: {flex: 1},
    visualRouteMarker: {position: 'absolute', width: 1, height: 1, fontSize: 1, lineHeight: 1, color: 'transparent'},
    stateCenter: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
    stateInner: {width: '100%', maxWidth: 320, alignItems: 'center'},
    stateMark: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
    stateMarkText: {fontSize: 22, fontWeight: '900'},
    stateTitle: {fontSize: 22, lineHeight: 30, fontWeight: '800', textAlign: 'center'},
    stateCopy: {marginTop: 8, fontSize: 14, lineHeight: 21, textAlign: 'center'},
    stateCta: {marginTop: 16, alignSelf: 'stretch'},
    stateCtaSub: {marginTop: 8, alignSelf: 'stretch'},
    stateProgressCard: {width: '100%', marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#F1F1EC'},
    stateProgressTrack: {height: 6, borderRadius: 999, backgroundColor: '#E7E7E2', overflow: 'hidden'},
    stateProgressValue: {width: '48%', height: '100%', borderRadius: 999, backgroundColor: '#FF4D6D'},
    subscriptionCenter: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20},
    subscriptionTitle: {marginTop: 12},
    subscriptionDesc: {marginTop: 8, maxWidth: 320},
    subscriptionCard: {alignItems: 'center', alignSelf: 'stretch', marginTop: 16},
    subscriptionPrice: {marginTop: 4},
    subscriptionSub: {marginTop: 4, textAlign: 'center'},
    subscriptionCtas: {alignSelf: 'stretch', marginTop: 16, gap: 8},
    pushBackdrop: {flex: 1, justifyContent: 'flex-end'},
    pushSheet: {borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12, maxHeight: '86%'},
    pushHandle: {width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12},
    pushIcon: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 8},
    pushTitle: {marginBottom: 4},
    pushDescription: {marginBottom: 12},
    pushPrimary: {marginTop: 12},
    pushSecondary: {marginTop: 8},
    homeIntro: {marginBottom: 24},
    homeIntroCopy: {marginTop: 8},
    homeList: {gap: 8},
    opsHoursTitle: {marginBottom: spacing.xs},
    opsHoursIntro: {marginBottom: spacing.xl, lineHeight: 22},
    opsHoursList: {gap: spacing.md},
    opsHoursDayCard: {gap: spacing.md},
    opsHoursDayHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    opsHoursClosedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 70,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: radius.pill,
        justifyContent: 'center',
    },
    opsHoursClosedHint: {marginTop: 2},
    opsHoursTimeRow: {flexDirection: 'row', gap: spacing.md},
    opsHoursTimeInput: {flex: 1},
    opsNfcSectionTitle: {marginBottom: spacing.md},
    opsNfcSectionTitleGap: {marginTop: spacing.xxl, marginBottom: spacing.md},
    opsNfcFormCard: {gap: spacing.md},
    opsNfcRegisterButton: {marginTop: spacing.xs},
    opsNfcList: {gap: spacing.sm},
    opsNfcTagCard: {gap: spacing.md},
    opsNfcTagRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    opsNfcFlex: {flex: 1, minWidth: 0},
    opsNfcToggleButton: {alignSelf: 'flex-start', borderRadius: radius.lg},
    opsEmployeeSection: {marginTop: spacing.md},
    opsEmployeeSectionTitle: {marginBottom: spacing.md},
    opsEmployeeList: {gap: spacing.sm},
    opsEmployeeRightRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    opsEmployeeAvatar: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    opsBillingGlyph: {fontSize: 22, fontWeight: '900', lineHeight: 24},
    scheduleFieldLabel: {marginTop: spacing.md, marginBottom: spacing.xs},
    scheduleTimeRow: {flexDirection: 'row', gap: spacing.md},
    scheduleFlex: {flex: 1},
    scheduleListTitle: {marginTop: spacing.xl, marginBottom: spacing.sm},
    scheduleNoticeHero: {marginBottom: spacing.sm},
    scheduleNoticeSub: {marginTop: spacing.sm},
    scheduleNoticeForm: {marginTop: spacing.xl, gap: spacing.md},
    scheduleNoticeFieldLabel: {marginBottom: spacing.xs, marginLeft: 2},
    myShiftContainer: {gap: spacing.lg},
    myShiftSummaryBar: {
        flexDirection: 'row',
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    myShiftSummaryItem: {flex: 1, alignItems: 'center', gap: 2},
    myShiftDivider: {width: 1, marginVertical: spacing.xs},
    myShiftDaySection: {gap: spacing.sm},
    myShiftDaySectionHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    myShiftCard: {paddingVertical: spacing.md},
    myShiftRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    myShiftIconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    myShiftFlex: {flex: 1},
    myShiftMonthList: {gap: spacing.sm},
    myShiftSectionTitle: {marginBottom: -spacing.xs},
    myShiftListCard: {paddingVertical: spacing.sm},
    scheduleApprovalIntro: {marginBottom: spacing.lg},
    scheduleApprovalIntroBody: {marginTop: spacing.xs},
    scheduleApprovalList: {gap: spacing.md},
    scheduleApprovalCard: {gap: spacing.md, paddingVertical: spacing.md},
    scheduleApprovalCardHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    scheduleApprovalIcon: {width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center'},
    scheduleApprovalFlex: {flex: 1, minWidth: 0},
    scheduleApprovalActions: {flexDirection: 'row', gap: spacing.sm},
    scheduleSwapScroll: {paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, flexGrow: 1},
    scheduleSwapPassRow: {marginBottom: spacing.md},
    scheduleSwapCard: {marginBottom: spacing.md},
    scheduleSwapCardTop: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
    scheduleSwapCardInfo: {flex: 1, marginRight: spacing.sm},
    scheduleSwapTime: {marginTop: 2},
    scheduleSwapOwner: {marginTop: spacing.xs},
    scheduleSwapApply: {marginTop: spacing.md},
    scheduleStoreTabBar: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg},
    scheduleStoreTabButton: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1},
    scheduleStoreSection: {gap: spacing.lg},
    scheduleStoreWeekHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.lg, padding: spacing.md},
    scheduleStoreWeekHeaderCenter: {flex: 1, alignItems: 'center', gap: spacing.xs},
    scheduleStoreSummaryPills: {flexDirection: 'row', gap: spacing.xs},
    scheduleStoreSummaryPill: {borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2},
    scheduleStoreActionRow: {flexDirection: 'row', gap: spacing.sm},
    scheduleStoreHintRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    scheduleStoreBoard: {gap: spacing.xs},
    scheduleStoreBoardRow: {minHeight: 84, height: 84, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderWidth: 1},
    scheduleStoreBoardHeader: {width: 52, alignItems: 'center', justifyContent: 'center', gap: 2},
    scheduleStoreBoardAdd: {width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    scheduleStoreBoardBody: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    scheduleStoreBoardChip: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: 150, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, shadowColor: '#000', shadowRadius: 6, shadowOffset: {width: 0, height: 3}},
    scheduleStoreBoardChipText: {flexShrink: 1},
    scheduleRequestsTitle: {marginBottom: spacing.sm},
    scheduleRequestsTitleGap: {marginTop: spacing.xxl, marginBottom: spacing.xs},
    scheduleRequestsHint: {marginBottom: spacing.sm},
    scheduleRequestsList: {gap: spacing.sm},
    scheduleRequestsCandidate: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md},
    scheduleRequestsStart: {marginTop: spacing.lg},
    scheduleRequestsRequestTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    scheduleWorkLogBody: {paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md},
    scheduleWorkLogMonthBar: {minHeight: 78, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    scheduleWorkLogMonthButton: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
    scheduleWorkLogMonthTitle: {flex: 1, paddingHorizontal: spacing.md},
    scheduleWorkLogSummaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    scheduleWorkLogMetric: {width: '48.7%', minHeight: 78, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, justifyContent: 'space-between'},
    scheduleWorkLogTotalCard: {padding: spacing.lg},
    scheduleWorkLogTotalRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md},
    scheduleWorkLogStatusChip: {minHeight: 32, borderRadius: radius.pill, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center'},
    scheduleWorkLogTableCard: {padding: 0, overflow: 'hidden'},
    scheduleWorkLogTableRow: {minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth},
    scheduleWorkLogHeaderRow: {minHeight: 44},
    scheduleWorkLogCell: {minHeight: 50, justifyContent: 'center', paddingHorizontal: spacing.sm},
    scheduleLeaveSpotCard: {marginTop: spacing.lg, gap: spacing.md},
    scheduleLeaveTrack: {flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden'},
    scheduleLeaveFill: {height: 12},
    scheduleLeaveLegendRow: {flexDirection: 'row', gap: spacing.lg},
    scheduleLeaveLegendItem: {alignItems: 'flex-start'},
    scheduleLeaveLegendLabelRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    scheduleLeaveLegendDot: {width: 8, height: 8, borderRadius: 4},
    scheduleLeaveLegendValue: {marginTop: spacing.xs},
    scheduleLeaveDisclaimer: {marginTop: spacing.md},
    attendanceContent: {paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 16},
    attendanceSpotCard: {gap: 4},
    attendanceSpotSub: {marginTop: 2},
    attendanceSegment: {marginTop: 0},
    attendanceList: {gap: 8},
    salaryCanvas: {flex: 1},
    salaryStorePicker: {paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4},
    salaryListContent: {paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, gap: 12},
    salaryHeroBlock: {marginTop: 16, marginBottom: 12},
    salaryCard: {gap: 12},
    salaryCardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8},
    salaryName: {flexShrink: 1},
    salaryCardBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12},
    salaryMeta: {flexShrink: 1, gap: 2},
    salaryAmount: {flexShrink: 0, maxWidth: '55%'},
    splashSafeArea: {flex: 1, backgroundColor: '#15171B'},
    splashGradient: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    splashCenter: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24},
    splashBrandName: {
        fontSize: 35,
        fontWeight: '900',
        color: '#FFFFFF',
        marginTop: 16,
        marginBottom: 8,
    },
    splashSlogan: {
        fontSize: 14,
        lineHeight: 20,
        color: '#FFFFFF',
        textAlign: 'center',
    },
    roleBody: {flex: 1, paddingHorizontal: 24, paddingTop: 24},
    roleMark: {marginBottom: 16},
    roleTitle: {letterSpacing: -0.6},
    roleCopy: {marginTop: 8, opacity: 0.72, marginBottom: 20},
    roleList: {gap: 8},
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245,243,239,0.18)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    roleCardSelected: {borderColor: '#FF7288', backgroundColor: 'rgba(255,255,255,0.09)'},
    roleCardText: {flexShrink: 1},
    roleHint: {marginTop: 2, opacity: 0.7},
    roleRecommendBadge: {
        backgroundColor: '#FFE1E6',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginLeft: 8,
    },
    roleRecommendText: {color: '#FF4D6D'},
    roleFooter: {paddingHorizontal: 24, paddingBottom: 16},
    onboardingSkipRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    onboardingSkipButton: {paddingHorizontal: 12, paddingVertical: 8},
    onboardingSkipText: {color: 'rgba(245,243,239,0.72)', fontSize: 15, fontWeight: '500'},
    onboardingSlide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
    },
    onboardingIllustration: {alignItems: 'center', justifyContent: 'center', marginTop: 16},
    onboardingHeadline: {
        marginTop: 32,
        fontSize: 30,
        lineHeight: 38,
        fontWeight: '800',
        color: '#F5F3EF',
        textAlign: 'center',
        letterSpacing: -1,
    },
    onboardingCopy: {
        marginTop: 16,
        fontSize: 17,
        color: 'rgba(245,243,239,0.72)',
        textAlign: 'center',
        lineHeight: 26,
    },
    onboardingIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 20,
    },
    onboardingDot: {width: 8, height: 8, borderRadius: 4},
    onboardingDotActive: {backgroundColor: '#FF7288', width: 24},
    onboardingDotInactive: {backgroundColor: 'rgba(245,243,239,0.3)'},
    onboardingFooter: {paddingHorizontal: 16, paddingBottom: 16},
    kakaoCenter: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24},
    kakaoTitle: {marginTop: 24, letterSpacing: -1},
    kakaoCopy: {marginTop: 12, opacity: 0.8, maxWidth: 320},
    kakaoFooter: {paddingHorizontal: 24, gap: 8},
    scroll: {flexGrow: 1, paddingTop: 34, paddingHorizontal: 16, paddingBottom: 20},
    hero: {alignItems: 'flex-start'},
    title: {
        marginTop: 13,
        color: '#F5F3EF',
        fontSize: 23,
        lineHeight: 29,
        fontWeight: '800',
        letterSpacing: -0.6,
        textAlign: 'left',
    },
    copy: {
        marginTop: 11,
        color: '#F5F3EF',
        fontSize: 13,
        lineHeight: 21,
        fontWeight: '400',
        opacity: 0.72,
        textAlign: 'left',
    },
    form: {marginTop: 17, gap: 9},
    personalRecordEditForm: {gap: spacing.md, marginTop: spacing.xs},
    pdfPreviewPage: {height: 320, alignItems: 'center', justifyContent: 'center'},
    pdfPreviewDoc: {alignItems: 'center'},
    pdfPreviewSub: {marginTop: spacing.xs},
    salaryDetailHero: {paddingTop: spacing.sm, paddingBottom: spacing.xl},
    salaryDetailSummary: {marginBottom: spacing.xxl, gap: spacing.xs},
    salaryDetailRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6},
    salaryDetailSubtitle: {marginBottom: spacing.md},
    salaryDetailItemsCard: {paddingVertical: spacing.xs},
    salaryDetailItemRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md},
    salaryDetailItemBorder: {borderBottomWidth: 1, borderBottomColor: '#E7E7E2'},
    salaryDetailItemLabel: {flexShrink: 1, gap: 2},
    calcDetailBody: {gap: spacing.xs, paddingBottom: spacing.sm},
    calcDetailMoney: {marginBottom: spacing.md},
    calcDetailDivider: {height: 1, marginVertical: spacing.xs},
    calcDetailRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md},
    calcDetailNote: {marginTop: spacing.sm, lineHeight: 16},
    billingMethodBox: {marginTop: spacing.xs},
    billingMethodValue: {marginTop: 2},
    billingMethodNext: {marginTop: 4},
    planDetailBody: {gap: spacing.sm, paddingBottom: spacing.sm},
    planDetailPriceCard: {marginBottom: spacing.sm},
    planDetailRecommended: {marginTop: spacing.xs},
    planDetailRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md},
    planDetailRowText: {flex: 1},
    field: {
        height: 43,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(245,243,239,0.22)',
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    fieldInput: {
        alignSelf: 'stretch',
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(245,243,239,0.9)',
        padding: 0,
        textAlignVertical: 'center',
    },
    signupBadgeRow: {marginBottom: 12},
    signupSectionLabel: {marginBottom: 8},
    signupHint: {marginTop: 12},
    signupHintSub: {marginTop: 4},
    signupForm: {marginTop: 24, gap: 12},
    signupEmailGroup: {gap: 8},
    button: {
        minHeight: 46,
        borderRadius: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
    },
    primaryButton: {
        marginTop: 2,
        backgroundColor: '#FF7288',
        // AppButton's v3 primary elevation is a coral glow. Keep this
        // native reference independent, but use the canonical token value.
        shadowColor: '#FF4D6D',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.32,
        shadowRadius: 16,
        elevation: 8,
    },
    kakaoButton: {backgroundColor: '#FEE500'},
    buttonRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
    buttonText: {fontSize: 14, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center'},
    primaryButtonText: {color: '#F5F3EF'},
    kakaoButtonText: {color: '#1F1A0E'},
    footerRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18},
    footerText: {color: '#F5F3EF', fontSize: 12, lineHeight: 16, fontWeight: '400', opacity: 0.65},
    landingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    landingHeaderTitle: {color: '#F5F3EF', fontSize: 12, lineHeight: 16, fontWeight: '400', opacity: 0.65},
    landingHeaderPill: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    landingHeaderPillText: {color: '#F5F3EF', fontSize: 12, lineHeight: 16, fontWeight: '700'},
    landingContent: {flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20},
    landingLogoZone: {alignItems: 'center', justifyContent: 'center', gap: 8},
    landingBrandmark: {transform: [{translateY: -4}]},
    landingTitle: {
        marginTop: 4,
        color: '#F5F3EF',
        fontSize: 26,
        lineHeight: 34,
        fontWeight: '700',
        letterSpacing: -0.6,
        textAlign: 'center',
    },
    landingTagline: {
        marginTop: 3,
        maxWidth: 280,
        color: '#F5F3EF',
        fontSize: 15,
        lineHeight: 23,
        fontWeight: '400',
        opacity: 0.78,
        textAlign: 'center',
    },
    landingButtons: {gap: 9, marginTop: 19},
    landingButton: {
        minHeight: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        alignSelf: 'stretch',
    },
    landingPrimaryButton: {
        backgroundColor: '#FF7288',
        shadowColor: '#FF4D6D',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.32,
        shadowRadius: 16,
        elevation: 8,
    },
    landingOutlineButton: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(245,245,239,0.3)',
        borderWidth: 1,
    },
    landingButtonText: {color: '#F5F3EF', fontSize: 14, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center'},
    unsupported: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12141B', padding: 24},
    unsupportedTitle: {color: '#F2F1EE', fontSize: 18, fontWeight: '700'},
    unsupportedCopy: {marginTop: 8, color: '#A6A9AE', textAlign: 'center'},
});

export default V3VisualHarnessScreen;
