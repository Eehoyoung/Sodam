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
import appHeaderOptions from './appHeaderOptions';

export type HomeStackParamList = {
    Home: undefined;
    Subscribe: undefined;
    QnA: undefined;
    InfoList: undefined;
    SalaryList: undefined;
    SalaryDetail: { payrollId: number };
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
        </Stack.Navigator>
    );
};

export default HomeNavigator;
