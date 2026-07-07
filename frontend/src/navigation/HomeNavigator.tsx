import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../features/home/screens/HomeScreen';
import SubscribeScreen from '../features/subscription/screens/SubscribeScreen';
import QnAScreen from '../features/qna/screens/QnAScreen';
import InfoListScreen from '../features/info/screens/InfoListScreen';
import LaborInfoDetailScreen from '../features/info/screens/LaborInfoDetailScreen';
import PolicyDetailScreen from '../features/info/screens/PolicyDetailScreen';
import TaxInfoDetailScreen from '../features/info/screens/TaxInfoDetailScreen';
import TipsDetailScreen from '../features/info/screens/TipsDetailScreen';
import SalaryListScreen from '../features/salary/screens/SalaryListScreen';
import SalaryDetailScreen from '../features/salary/screens/SalaryDetailScreen';
import SalaryArchiveScreen from '../features/salary/screens/SalaryArchiveScreen';
import RequestStatusScreen from '../features/myPage/screens/RequestStatusScreen';
import EmployeeMyPageRNScreen from '../features/myPage/screens/EmployeeMyPageRNScreen';
import MasterMyPageScreen from '../features/myPage/screens/MasterMyPageScreen';
import ManagerMyPageScreen from '../features/myPage/screens/ManagerMyPageScreen';
import UserMyPageScreen from '../features/myPage/screens/PersonalUserScreen';
import Header from '../common/components/layout/Header';
import ProfileScreen from '../features/auth/screens/ProfileScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import StoreRegistrationScreen from '../features/store/StoreRegistraionScreen';
import StoreDetailScreen from '../features/store/screens/StoreDetailScreen';
import AttendanceScreen from '../features/attendance/screens/AttendanceScreen';
import EmployeeAttendanceHome from '../features/attendance/screens/EmployeeAttendanceHome';
import OwnerDashboardScreen from '../features/home/screens/OwnerDashboardScreen';
import EmployeeDetailScreen from '../features/store/screens/EmployeeDetailScreen';
import EmployeeManagementScreen from '../features/store/screens/EmployeeManagementScreen';
import PayrollRunScreen from '../features/salary/screens/PayrollRunScreen';
import JoinStoreByCodeScreen from '../features/store/screens/JoinStoreByCodeScreen';
import AttendanceCorrectionRequestScreen from '../features/attendance/screens/AttendanceCorrectionRequestScreen';
import NotificationSettingsScreen from '../features/settings/screens/NotificationSettingsScreen';
import AttendanceCalendarScreen from '../features/attendance/screens/AttendanceCalendarScreen';
import EmployeeWorkLogScreen from '../features/attendance/screens/EmployeeWorkLogScreen';
import NotificationCenterScreen from '../features/notification/screens/NotificationCenterScreen';
import WageSettingsScreen from '../features/store/screens/WageSettingsScreen';
import StoreEditScreen from '../features/store/screens/StoreEditScreen';
import StoreOperatingHoursScreen from '../features/store/screens/StoreOperatingHoursScreen';
import MissingAttendanceCenterScreen from '../features/attendance/screens/MissingAttendanceCenterScreen';
import AccountSettingsScreen from '../features/myPage/screens/AccountSettingsScreen';
import TimeOffRequestScreen from '../features/timeoff/screens/TimeOffRequestScreen';
import TimeOffApprovalScreen from '../features/timeoff/screens/TimeOffApprovalScreen';
import ReferralScreen from '../features/referral/screens/ReferralScreen';
import TossBillingAuthScreen from '../features/subscription/screens/TossBillingAuthScreen';
import PurchaseLedgerScreen from '../features/purchase/screens/PurchaseLedgerScreen';
import PurchaseScanScreen from '../features/purchase/screens/PurchaseScanScreen';
import PurchaseConfirmScreen from '../features/purchase/screens/PurchaseConfirmScreen';
import PriceTrendScreen from '../features/purchase/screens/PriceTrendScreen';
import ReorderHintScreen from '../features/purchase/screens/ReorderHintScreen';
import PayrollPreviewScreen from '../features/salary/screens/PayrollPreviewScreen';
import WeeklyInsightsScreen from '../features/store/screens/WeeklyInsightsScreen';
import MyContractScreen from '../features/contract/screens/MyContractScreen';
import ContractSignScreen from '../features/contract/screens/ContractSignScreen';
import SendContractScreen from '../features/contract/screens/SendContractScreen';
import DraftContractsScreen from '../features/contract/screens/DraftContractsScreen';
import WithholdingStatementScreen from '../features/salary/screens/WithholdingStatementScreen';
import EmployeeDocumentsScreen from '../features/document/screens/EmployeeDocumentsScreen';
import AddDocumentScreen from '../features/document/screens/AddDocumentScreen';
import BreakRecordScreen from '../features/breakrecord/screens/BreakRecordScreen';
import SendBonusScreen from '../features/bonus/screens/SendBonusScreen';
import HeadcountTrendScreen from '../features/salary/screens/HeadcountTrendScreen';
import MinorGuardScreen from '../features/minorguard/screens/MinorGuardScreen';
import MyWageHistoryScreen from '../features/wage/screens/MyWageHistoryScreen';
import MyLeaveBalanceScreen from '../features/timeoff/screens/MyLeaveBalanceScreen';
import SubsidyEligibilityScreen from '../features/store/screens/SubsidyEligibilityScreen';
import TaxDeadlineScreen from '../features/salary/screens/TaxDeadlineScreen';
import TaxReportScreen from '../features/salary/screens/TaxReportScreen';
import LegalLedgerScreen from '../features/salary/screens/LegalLedgerScreen';
import MyShiftScreen from '../features/shift/screens/MyShiftScreen';
import EditShiftScreen from '../features/shift/screens/EditShiftScreen';
import StoreScheduleScreen from '../features/shift/screens/StoreScheduleScreen';
import AttendanceApprovalScreen from '../features/attendance/screens/AttendanceApprovalScreen';
import TaxSimulatorScreen from '../features/salary/screens/TaxSimulatorScreen';
import PersonalAnnualTaxScreen from '../features/workplace/screens/PersonalAnnualTaxScreen';
import StoreNoticeListScreen from '../features/notice/screens/StoreNoticeListScreen';
import WriteNoticeScreen from '../features/notice/screens/WriteNoticeScreen';
import MyNoticeScreen from '../features/notice/screens/MyNoticeScreen';
import OnboardingScreen from '../features/onboarding/screens/OnboardingScreen';
import EvidencePackageScreen from '../features/evidence/screens/EvidencePackageScreen';
import PdfPreviewScreen from '../features/salary/screens/PdfPreviewScreen';
import DailySalesEntryScreen from '../features/sales/screens/DailySalesEntryScreen';
import LaborCostRatioScreen from '../features/sales/screens/LaborCostRatioScreen';
import MyCertificateScreen from '../features/certificate/screens/MyCertificateScreen';
import LaborRiskDashboardScreen from '../features/risk/screens/LaborRiskDashboardScreen';
import AttendanceIrregularitiesScreen from '../features/attendance/screens/AttendanceIrregularitiesScreen';
import AttendanceNoticeScreen from '../features/attendance/screens/AttendanceNoticeScreen';
import HiringCostSimulatorScreen from '../features/risk/screens/HiringCostSimulatorScreen';
import SwapRequestsScreen from '../features/shift/screens/SwapRequestsScreen';
import SwapBoardScreen from '../features/shift/screens/SwapBoardScreen';
import type {ReceiptDraft} from '../features/purchase/types';
import appHeaderOptions from './appHeaderOptions';

export type HomeStackParamList = {
    Home: undefined;
    Subscribe: undefined;
    QnA: undefined;
    InfoList: undefined;
    SalaryList: undefined;
    SalaryDetail: { payrollId: number };
    SalaryArchive: undefined;
    RequestStatus: undefined;
    LaborInfoDetail: { laborInfoId: number };
    PolicyDetail: { policyId: number };
    TaxInfoDetail: { taxInfoId: number };
    TipsDetail: { tipId: number };
    Attendance: undefined;
    EmployeeMyPageScreen: undefined;
    MasterMyPageScreen: undefined;
    ManagerMyPageScreen: undefined;
    UserMyPageScreen: undefined;
    Settings: undefined;
    Profile: undefined;
    StoreRegistration: undefined;
    StoreDetail: { storeId: number };
    OwnerDashboard: undefined;
    EmployeeAttendanceHome: undefined;
    EmployeeDetail: { employeeId: number; storeId: number };
    EmployeeManagement: { storeId: number };
    PayrollRun: { storeId?: number } | undefined;
    JoinStoreByCode: undefined;
    AttendanceCorrectionRequest: {
        attendanceId?: number;
        date?: string;
        storeName?: string;
        currentCheckIn?: string;
        currentCheckOut?: string;
    } | undefined;
    NotificationSettings: undefined;
    NotificationCenter: undefined;
    AttendanceCalendar: undefined;
    EmployeeWorkLog: {storeId?: number} | undefined;
    WageSettings: {storeId: number};
    StoreEdit: {storeId: number};
    StoreOperatingHours: {storeId: number};
    MissingAttendanceCenter: undefined;
    AccountSettings: undefined;
    TimeOffRequest: {storeId: number};
    Referral: undefined;
    TossBillingAuth: {plan: string; billingCycle: string};
    PurchaseLedger: {storeId: number};
    PurchaseScan: {storeId: number};
    PurchaseConfirm: {storeId: number; draft?: ReceiptDraft; purchaseId?: number};
    PriceTrend: {storeId: number; item?: string};
    ReorderHint: {storeId: number};
    PayrollPreview: {storeId: number; hourlyWage?: number};
    WeeklyInsights: {storeId: number};
    MyContract: undefined;
    ContractSign: {contractId: number};
    SendContract: {storeId: number; employeeId?: number; employeeName?: string};
    DraftContracts: {storeId: number; employeeId: number; employeeName?: string};
    SendBonus: {storeId: number; employeeId: number; employeeName?: string};
    WithholdingStatement: {storeId: number};
    EmployeeDocuments: {storeId: number; employeeId: number; employeeName?: string};
    AddDocument: {storeId: number; employeeId: number};
    BreakRecord: {storeId: number; employeeId: number; employeeName?: string};
    HeadcountTrend: {storeId: number};
    MinorGuard: {storeId: number; employeeId: number; employeeName?: string};
    MyWageHistory: undefined;
    MyLeaveBalance: undefined;
    SubsidyEligibility: {storeId: number};
    TaxDeadline: {storeId: number};
    TaxReport: {storeId: number};
    LegalLedger: {storeId: number};
    MyShift: undefined;
    EditShift: {storeId: number; employeeId: number; employeeName?: string};
    StoreSchedule: {storeId: number};
    AttendanceApproval: {storeId: number};
    TimeOffApproval: undefined;
    TaxSimulator: undefined;
    PersonalAnnualTax: undefined;
    StoreNoticeList: {storeId: number};
    WriteNotice: {storeId: number};
    MyNotice: undefined;
    Onboarding: {storeId?: number; employeeId?: number; employeeName?: string} | undefined;
    EvidencePackage: {storeId: number; employeeId: number; employeeName?: string};
    PdfPreview: {title?: string; sub?: string; onDownload?: () => void; onShare?: () => void} | undefined;
    DailySales: {storeId: number};
    LaborCostRatio: {storeId: number};
    MyCertificate: {storeId?: number} | undefined;
    LaborRisk: {storeId: number};
    AttendanceIrregularities: {storeId: number};
    AttendanceNotice: {storeId: number};
    SwapRequests: {storeId: number};
    SwapBoard: {storeId?: number} | undefined;
    HiringCost: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * 메인 앱 화면들을 위한 네비게이터
 * 홈, 정보 상세, 마이페이지 등의 화면을 포함
 */
interface HomeNavigatorProps {
    initialScreen?: keyof HomeStackParamList;
}

const HomeNavigator: React.FC<HomeNavigatorProps> = ({ initialScreen }) => {
    return (
        <Stack.Navigator
            initialRouteName={initialScreen ?? 'Home'}
            screenOptions={{
                ...appHeaderOptions,
                presentation: 'card',
            }}
        >
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    headerShown: true,
                    header: () => <Header/>, // props 전달하지 않고 단순히 Header 컴포넌트만 렌더링
                }}
            />

            <Stack.Screen name="Subscribe" component={SubscribeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="QnA" component={QnAScreen} options={{ headerShown: false }} />
            <Stack.Screen name="InfoList" component={InfoListScreen} options={{ headerShown: false }} />

            <Stack.Screen name="LaborInfoDetail" component={LaborInfoDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PolicyDetail" component={PolicyDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TaxInfoDetail" component={TaxInfoDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TipsDetail" component={TipsDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen
                name="Attendance"
                component={AttendanceScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="SalaryList"
                component={SalaryListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="SalaryDetail"
                component={SalaryDetailScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="SalaryArchive"
                component={SalaryArchiveScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="RequestStatus"
                component={RequestStatusScreen}
                options={{ headerShown: false }}
            />

            <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{headerShown: false}}
            />

            <Stack.Screen
                name="EmployeeMyPageScreen"
                component={EmployeeMyPageRNScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="MasterMyPageScreen"
                component={MasterMyPageScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="ManagerMyPageScreen"
                component={ManagerMyPageScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="UserMyPageScreen"
                component={UserMyPageScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="StoreRegistration"
                component={StoreRegistrationScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="StoreDetail"
                component={StoreDetailScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="OwnerDashboard"
                component={OwnerDashboardScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="EmployeeAttendanceHome"
                component={EmployeeAttendanceHome}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="EmployeeDetail"
                component={EmployeeDetailScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="EmployeeManagement"
                component={EmployeeManagementScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="PayrollRun"
                component={PayrollRunScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="JoinStoreByCode"
                component={JoinStoreByCodeScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="AttendanceCorrectionRequest"
                component={AttendanceCorrectionRequestScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettingsScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="NotificationCenter"
                component={NotificationCenterScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="AttendanceCalendar"
                component={AttendanceCalendarScreen}
                options={{headerShown: false}}
            />
            <Stack.Screen name="EmployeeWorkLog" component={EmployeeWorkLogScreen} options={{headerShown: false}} />
            <Stack.Screen name="WageSettings" component={WageSettingsScreen} options={{headerShown: false}} />
            <Stack.Screen name="StoreEdit" component={StoreEditScreen} options={{headerShown: false}} />
            <Stack.Screen name="StoreOperatingHours" component={StoreOperatingHoursScreen} options={{headerShown: false}} />
            <Stack.Screen name="MissingAttendanceCenter" component={MissingAttendanceCenterScreen} options={{headerShown: false}} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{headerShown: false}} />
            <Stack.Screen name="TimeOffRequest" component={TimeOffRequestScreen} options={{headerShown: false}} />
            <Stack.Screen name="Referral" component={ReferralScreen} options={{headerShown: false}} />
            <Stack.Screen name="TossBillingAuth" component={TossBillingAuthScreen} options={{headerShown: false}} />
            <Stack.Screen name="PurchaseLedger" component={PurchaseLedgerScreen} options={{headerShown: false}} />
            <Stack.Screen name="PurchaseScan" component={PurchaseScanScreen} options={{headerShown: false}} />
            <Stack.Screen name="PurchaseConfirm" component={PurchaseConfirmScreen} options={{headerShown: false}} />
            <Stack.Screen name="PriceTrend" component={PriceTrendScreen} options={{headerShown: false}} />
            <Stack.Screen name="ReorderHint" component={ReorderHintScreen} options={{headerShown: false}} />
            <Stack.Screen name="PayrollPreview" component={PayrollPreviewScreen} options={{headerShown: false}} />
            <Stack.Screen name="WeeklyInsights" component={WeeklyInsightsScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyContract" component={MyContractScreen} options={{headerShown: false}} />
            <Stack.Screen name="ContractSign" component={ContractSignScreen} options={{headerShown: false}} />
            <Stack.Screen name="SendContract" component={SendContractScreen} options={{headerShown: false}} />
            <Stack.Screen name="DraftContracts" component={DraftContractsScreen} options={{headerShown: false}} />
            <Stack.Screen name="WithholdingStatement" component={WithholdingStatementScreen} options={{headerShown: false}} />
            <Stack.Screen name="EmployeeDocuments" component={EmployeeDocumentsScreen} options={{headerShown: false}} />
            <Stack.Screen name="AddDocument" component={AddDocumentScreen} options={{headerShown: false}} />
            <Stack.Screen name="BreakRecord" component={BreakRecordScreen} options={{headerShown: false}} />
            <Stack.Screen name="SendBonus" component={SendBonusScreen} options={{headerShown: false}} />
            <Stack.Screen name="HeadcountTrend" component={HeadcountTrendScreen} options={{headerShown: false}} />
            <Stack.Screen name="MinorGuard" component={MinorGuardScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyWageHistory" component={MyWageHistoryScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyLeaveBalance" component={MyLeaveBalanceScreen} options={{headerShown: false}} />
            <Stack.Screen name="SubsidyEligibility" component={SubsidyEligibilityScreen} options={{headerShown: false}} />
            <Stack.Screen name="TaxDeadline" component={TaxDeadlineScreen} options={{headerShown: false}} />
            <Stack.Screen name="TaxReport" component={TaxReportScreen} options={{headerShown: false}} />
            <Stack.Screen name="LegalLedger" component={LegalLedgerScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyShift" component={MyShiftScreen} options={{headerShown: false}} />
            <Stack.Screen name="EditShift" component={EditShiftScreen} options={{headerShown: false}} />
            <Stack.Screen name="StoreSchedule" component={StoreScheduleScreen} options={{headerShown: false}} />
            <Stack.Screen name="AttendanceApproval" component={AttendanceApprovalScreen} options={{headerShown: false}} />
            <Stack.Screen name="TimeOffApproval" component={TimeOffApprovalScreen} options={{headerShown: false}} />
            <Stack.Screen name="TaxSimulator" component={TaxSimulatorScreen} options={{headerShown: false}} />
            <Stack.Screen name="PersonalAnnualTax" component={PersonalAnnualTaxScreen} options={{headerShown: false}} />
            <Stack.Screen name="StoreNoticeList" component={StoreNoticeListScreen} options={{headerShown: false}} />
            <Stack.Screen name="WriteNotice" component={WriteNoticeScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyNotice" component={MyNoticeScreen} options={{headerShown: false}} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown: false}} />
            <Stack.Screen name="EvidencePackage" component={EvidencePackageScreen} options={{headerShown: false}} />
            <Stack.Screen name="PdfPreview" component={PdfPreviewScreen} options={{headerShown: false}} />
            <Stack.Screen name="DailySales" component={DailySalesEntryScreen} options={{headerShown: false}} />
            <Stack.Screen name="LaborCostRatio" component={LaborCostRatioScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyCertificate" component={MyCertificateScreen} options={{headerShown: false}} />
            <Stack.Screen name="LaborRisk" component={LaborRiskDashboardScreen} options={{headerShown: false}} />
            <Stack.Screen name="AttendanceIrregularities" component={AttendanceIrregularitiesScreen} options={{headerShown: false}} />
            <Stack.Screen name="AttendanceNotice" component={AttendanceNoticeScreen} options={{headerShown: false}} />
            <Stack.Screen name="SwapRequests" component={SwapRequestsScreen} options={{headerShown: false}} />
            <Stack.Screen name="SwapBoard" component={SwapBoardScreen} options={{headerShown: false}} />
            <Stack.Screen name="HiringCost" component={HiringCostSimulatorScreen} options={{headerShown: false}} />
        </Stack.Navigator>
    );
};

export default HomeNavigator;
