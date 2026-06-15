import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import type {AuthPurpose, OnboardingRole} from './authFlow';

export type RootStackParamList = {
    Welcome: {selectedRole?: OnboardingRole; selectedPurpose?: AuthPurpose} | undefined;
    WelcomeMain: {selectedRole?: OnboardingRole; selectedPurpose?: AuthPurpose} | undefined;
    Auth: {screen?: keyof AuthStackParamList; params?: AuthStackParamList[keyof AuthStackParamList]};
    HomeRoot: {screen?: keyof HomeStackParamList; params?: any} | undefined;
    SessionExpired: undefined;
    PermissionDenied: {kind?: string; secondaryLabel?: string} | undefined;
    PaymentFailed: undefined;
    SubscriptionGate: {mode?: string; featureName?: string} | undefined;
};

export type AuthStackParamList = {
    Login: {selectedPurpose?: AuthPurpose; fromSignup?: boolean} | undefined;
    Signup: {selectedPurpose?: AuthPurpose} | undefined;
    PasswordReset: undefined;
    OnboardingCarousel: undefined;
    KakaoLogin: {selectedPurpose?: AuthPurpose} | undefined;
    Consent: {selectedPurpose?: AuthPurpose} | undefined;
    ProfileBasics: {selectedPurpose?: AuthPurpose} | undefined;
};

export type HomeStackParamList = {
    Home: undefined;
    Attendance: undefined;
    WorkplaceList: undefined;
    WorkplaceDetail: {workplaceId: string};
    SalaryList: undefined;
    InfoMain: undefined;
    LaborInfoDetail: {laborInfoId: number};
    TaxInfoDetail: {taxInfoId: number};
    TipsDetail: {tipId: number};
    PolicyDetail: {policyId: number};
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
    WageSettings: {storeId: number};
    StoreEdit: {storeId: number};
    StoreOperatingHours: {storeId: number};
    MissingAttendanceCenter: undefined;
    AccountSettings: undefined;
    TimeOffRequest: {storeId: number};
    Referral: undefined;
    TossBillingAuth: {plan: string; billingCycle: string};
};

export type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
export type SignupScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
export type WorkplaceListScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'WorkplaceList'>;
export type WorkplaceDetailScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'WorkplaceDetail'>;
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type WorkplaceDetailRouteProp = RouteProp<HomeStackParamList, 'WorkplaceDetail'>;
