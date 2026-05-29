import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';

// 루트 스택 파라미터 목록
export type RootStackParamList = {
    Welcome: undefined;  // 새로운 메인화면 (첫 방문자용)
    Auth: { screen?: keyof AuthStackParamList; params?: any };
    HomeRoot: { screen?: keyof HomeStackParamList; params?: any } | undefined;
    // 기타 루트 레벨 화면...
};

// 인증 스택 파라미터 목록
export type AuthStackParamList = {
    Login: undefined;
    Signup: undefined;
    PasswordReset: undefined;
    OnboardingCarousel: undefined;
    KakaoLogin: undefined;
    /** 회원가입 후 1회성 프로필 보강 (휴대폰·이름·생년월일) */
    ProfileBasics: undefined;
};

// 홈 스택 파라미터 목록
export type HomeStackParamList = {
    Home: undefined;
    Attendance: undefined;
    WorkplaceList: undefined;
    WorkplaceDetail: { workplaceId: string };
    SalaryList: undefined;
    InfoMain: undefined;
    LaborInfoDetail: { laborInfoId: number };
    TaxInfoDetail: { taxInfoId: number };
    TipsDetail: { tipId: number };
    PolicyDetail: { policyId: number };
    QnA: undefined;
    EmployeeMyPageScreen: undefined;
    ManagerMyPageScreen: undefined;
    MasterMyPageScreen: undefined;
    UserMyPageScreen: undefined;
    Subscribe: undefined;
    Settings: undefined;
    Profile: undefined;
    OwnerDashboard: undefined;
    EmployeeAttendanceHome: undefined;
    EmployeeDetail: {employeeId: number; storeId: number};
    PayrollRun: {storeId?: number} | undefined;
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
    // 기타 홈 스택 화면...
};

// 네비게이션 프롭 타입 정의
export type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
export type SignupScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
export type WorkplaceListScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'WorkplaceList'>;
export type WorkplaceDetailScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'WorkplaceDetail'>;
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 라우트 프롭 타입 정의 (필요한 경우)
export type WorkplaceDetailRouteProp = RouteProp<HomeStackParamList, 'WorkplaceDetail'>;
