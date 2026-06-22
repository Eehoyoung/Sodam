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
import PayrollRunScreen from '../features/salary/screens/PayrollRunScreen';
import JoinStoreByCodeScreen from '../features/store/screens/JoinStoreByCodeScreen';
import AttendanceCorrectionRequestScreen from '../features/attendance/screens/AttendanceCorrectionRequestScreen';
import NotificationSettingsScreen from '../features/settings/screens/NotificationSettingsScreen';
import AttendanceCalendarScreen from '../features/attendance/screens/AttendanceCalendarScreen';
import NotificationCenterScreen from '../features/notification/screens/NotificationCenterScreen';
import WageSettingsScreen from '../features/store/screens/WageSettingsScreen';
import StoreEditScreen from '../features/store/screens/StoreEditScreen';
import StoreOperatingHoursScreen from '../features/store/screens/StoreOperatingHoursScreen';
import MissingAttendanceCenterScreen from '../features/attendance/screens/MissingAttendanceCenterScreen';
import AccountSettingsScreen from '../features/myPage/screens/AccountSettingsScreen';
import TimeOffRequestScreen from '../features/timeoff/screens/TimeOffRequestScreen';
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
import WithholdingStatementScreen from '../features/salary/screens/WithholdingStatementScreen';
import EmployeeDocumentsScreen from '../features/document/screens/EmployeeDocumentsScreen';
import AddDocumentScreen from '../features/document/screens/AddDocumentScreen';
import BreakRecordScreen from '../features/breakrecord/screens/BreakRecordScreen';
import HeadcountTrendScreen from '../features/salary/screens/HeadcountTrendScreen';
import MinorGuardScreen from '../features/minorguard/screens/MinorGuardScreen';
import MyWageHistoryScreen from '../features/wage/screens/MyWageHistoryScreen';
import MyLeaveBalanceScreen from '../features/timeoff/screens/MyLeaveBalanceScreen';
import SubsidyEligibilityScreen from '../features/store/screens/SubsidyEligibilityScreen';
import TaxDeadlineScreen from '../features/salary/screens/TaxDeadlineScreen';
import LegalLedgerScreen from '../features/salary/screens/LegalLedgerScreen';
import MyShiftScreen from '../features/shift/screens/MyShiftScreen';
import EditShiftScreen from '../features/shift/screens/EditShiftScreen';
import TaxSimulatorScreen from '../features/salary/screens/TaxSimulatorScreen';
import PersonalAnnualTaxScreen from '../features/workplace/screens/PersonalAnnualTaxScreen';
import StoreNoticeListScreen from '../features/notice/screens/StoreNoticeListScreen';
import WriteNoticeScreen from '../features/notice/screens/WriteNoticeScreen';
import MyNoticeScreen from '../features/notice/screens/MyNoticeScreen';
import OnboardingScreen from '../features/onboarding/screens/OnboardingScreen';
import EvidencePackageScreen from '../features/evidence/screens/EvidencePackageScreen';
import PdfPreviewScreen from '../features/salary/screens/PdfPreviewScreen';
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
    LegalLedger: {storeId: number};
    MyShift: undefined;
    EditShift: {storeId: number; employeeId: number; employeeName?: string};
    TaxSimulator: undefined;
    PersonalAnnualTax: undefined;
    StoreNoticeList: {storeId: number};
    WriteNotice: {storeId: number};
    MyNotice: undefined;
    Onboarding: {storeId?: number; employeeId?: number; employeeName?: string} | undefined;
    EvidencePackage: {storeId: number; employeeId: number; employeeName?: string};
    PdfPreview: {title?: string; sub?: string; onDownload?: () => void; onShare?: () => void} | undefined;
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

            <Stack.Screen name="Subscribe" component={SubscribeScreen} options={{ title: '구독하기' }} />
            <Stack.Screen name="QnA" component={QnAScreen} options={{ title: 'Q&A' }} />
            <Stack.Screen name="InfoList" component={InfoListScreen} options={{ title: '정보 서비스' }} />

            <Stack.Screen name="LaborInfoDetail" component={LaborInfoDetailScreen} options={{ title: '노동 정보 상세' }} />
            <Stack.Screen name="PolicyDetail" component={PolicyDetailScreen} options={{ title: '정책 상세' }} />
            <Stack.Screen name="TaxInfoDetail" component={TaxInfoDetailScreen} options={{ title: '세무 정보 상세' }} />
            <Stack.Screen name="TipsDetail" component={TipsDetailScreen} options={{ title: '팁 상세' }} />
            <Stack.Screen
                name="Attendance"
                component={AttendanceScreen}
                options={{ headerShown: true, title: '출퇴근 관리' }}
            />
            <Stack.Screen
                name="SalaryList"
                component={SalaryListScreen}
                options={{ headerShown: true, title: '급여 내역' }}
            />
            <Stack.Screen
                name="SalaryDetail"
                component={SalaryDetailScreen}
                options={{ headerShown: true, title: '급여 상세' }}
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
                options={{headerShown: true, title: '설정'}}
            />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{headerShown: true, title: '내 프로필'}}
            />

            <Stack.Screen
                name="EmployeeMyPageScreen"
                component={EmployeeMyPageRNScreen}
                options={{headerShown: true, title: '사원 마이페이지'}}
            />
            <Stack.Screen
                name="MasterMyPageScreen"
                component={MasterMyPageScreen}
                options={{headerShown: true, title: '사장 마이페이지'}}
            />
            <Stack.Screen
                name="ManagerMyPageScreen"
                component={ManagerMyPageScreen}
                options={{headerShown: true, title: '매니저 마이페이지'}}
            />
            <Stack.Screen
                name="UserMyPageScreen"
                component={UserMyPageScreen}
                options={{headerShown: true, title: '개인 마이페이지'}}
            />
            <Stack.Screen
                name="StoreRegistration"
                component={StoreRegistrationScreen}
                options={{headerShown: true, title: '매장 등록'}}
            />
            <Stack.Screen
                name="StoreDetail"
                component={StoreDetailScreen}
                options={{headerShown: true, title: '매장 상세'}}
            />
            <Stack.Screen
                name="OwnerDashboard"
                component={OwnerDashboardScreen}
                options={{headerShown: true, title: '대시보드'}}
            />
            <Stack.Screen
                name="EmployeeAttendanceHome"
                component={EmployeeAttendanceHome}
                options={{headerShown: true, title: '출퇴근'}}
            />
            <Stack.Screen
                name="EmployeeDetail"
                component={EmployeeDetailScreen}
                options={{headerShown: true, title: '직원 상세'}}
            />
            <Stack.Screen
                name="PayrollRun"
                component={PayrollRunScreen}
                options={{headerShown: true, title: '급여 정산'}}
            />
            <Stack.Screen
                name="JoinStoreByCode"
                component={JoinStoreByCodeScreen}
                options={{headerShown: true, title: '매장 가입'}}
            />
            <Stack.Screen
                name="AttendanceCorrectionRequest"
                component={AttendanceCorrectionRequestScreen}
                options={{headerShown: true, title: '정정 요청'}}
            />
            <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettingsScreen}
                options={{headerShown: true, title: '알림 설정'}}
            />
            <Stack.Screen
                name="NotificationCenter"
                component={NotificationCenterScreen}
                options={{headerShown: true, title: '알림'}}
            />
            <Stack.Screen
                name="AttendanceCalendar"
                component={AttendanceCalendarScreen}
                options={{headerShown: true, title: '근무 캘린더'}}
            />
            <Stack.Screen name="WageSettings" component={WageSettingsScreen} options={{headerShown: true, title: '시급 설정'}} />
            <Stack.Screen name="StoreEdit" component={StoreEditScreen} options={{headerShown: true, title: '매장 정보 편집'}} />
            <Stack.Screen name="StoreOperatingHours" component={StoreOperatingHoursScreen} options={{headerShown: true, title: '운영시간 설정'}} />
            <Stack.Screen name="MissingAttendanceCenter" component={MissingAttendanceCenterScreen} options={{headerShown: true, title: '출퇴근 이상'}} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{headerShown: true, title: '계정 설정'}} />
            <Stack.Screen name="TimeOffRequest" component={TimeOffRequestScreen} options={{headerShown: true, title: '휴가 신청'}} />
            <Stack.Screen name="Referral" component={ReferralScreen} options={{headerShown: true, title: '친구 추천'}} />
            <Stack.Screen name="TossBillingAuth" component={TossBillingAuthScreen} options={{headerShown: true, title: '카드 등록'}} />
            <Stack.Screen name="PurchaseLedger" component={PurchaseLedgerScreen} options={{headerShown: true, title: '매입장부'}} />
            <Stack.Screen name="PurchaseScan" component={PurchaseScanScreen} options={{headerShown: true, title: '매입 추가'}} />
            <Stack.Screen name="PurchaseConfirm" component={PurchaseConfirmScreen} options={{headerShown: true, title: '확인하고 저장'}} />
            <Stack.Screen name="PriceTrend" component={PriceTrendScreen} options={{headerShown: true, title: '가격 추이'}} />
            <Stack.Screen name="ReorderHint" component={ReorderHintScreen} options={{headerShown: true, title: '발주 참고'}} />
            <Stack.Screen name="PayrollPreview" component={PayrollPreviewScreen} options={{headerShown: true, title: '급여 미리보기'}} />
            <Stack.Screen name="WeeklyInsights" component={WeeklyInsightsScreen} options={{headerShown: true, title: '이번 주 인사이트'}} />
            <Stack.Screen name="MyContract" component={MyContractScreen} options={{headerShown: false}} />
            <Stack.Screen name="ContractSign" component={ContractSignScreen} options={{headerShown: false}} />
            <Stack.Screen name="SendContract" component={SendContractScreen} options={{headerShown: false}} />
            <Stack.Screen name="WithholdingStatement" component={WithholdingStatementScreen} options={{headerShown: true, title: '세무 자료'}} />
            <Stack.Screen name="EmployeeDocuments" component={EmployeeDocumentsScreen} options={{headerShown: false}} />
            <Stack.Screen name="AddDocument" component={AddDocumentScreen} options={{headerShown: false}} />
            <Stack.Screen name="BreakRecord" component={BreakRecordScreen} options={{headerShown: false}} />
            <Stack.Screen name="HeadcountTrend" component={HeadcountTrendScreen} options={{headerShown: true, title: '고용 공제 신호'}} />
            <Stack.Screen name="MinorGuard" component={MinorGuardScreen} options={{headerShown: true, title: '연소근로자 확인'}} />
            <Stack.Screen name="MyWageHistory" component={MyWageHistoryScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyLeaveBalance" component={MyLeaveBalanceScreen} options={{headerShown: false}} />
            <Stack.Screen name="SubsidyEligibility" component={SubsidyEligibilityScreen} options={{headerShown: true, title: '지원금 자격'}} />
            <Stack.Screen name="TaxDeadline" component={TaxDeadlineScreen} options={{headerShown: true, title: '세무 신고 기한'}} />
            <Stack.Screen name="LegalLedger" component={LegalLedgerScreen} options={{headerShown: true, title: '법정 장부'}} />
            <Stack.Screen name="MyShift" component={MyShiftScreen} options={{headerShown: false}} />
            <Stack.Screen name="EditShift" component={EditShiftScreen} options={{headerShown: false}} />
            <Stack.Screen name="TaxSimulator" component={TaxSimulatorScreen} options={{headerShown: true, title: '세무 시뮬레이터'}} />
            <Stack.Screen name="PersonalAnnualTax" component={PersonalAnnualTaxScreen} options={{headerShown: false}} />
            <Stack.Screen name="StoreNoticeList" component={StoreNoticeListScreen} options={{headerShown: false}} />
            <Stack.Screen name="WriteNotice" component={WriteNoticeScreen} options={{headerShown: false}} />
            <Stack.Screen name="MyNotice" component={MyNoticeScreen} options={{headerShown: false}} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown: false}} />
            <Stack.Screen name="EvidencePackage" component={EvidencePackageScreen} options={{headerShown: false}} />
            <Stack.Screen name="PdfPreview" component={PdfPreviewScreen} options={{headerShown: false}} />
        </Stack.Navigator>
    );
};

export default HomeNavigator;
