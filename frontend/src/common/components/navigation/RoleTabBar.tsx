/**
 * RoleTabBar — 허브 화면 하단 역할별 탭 바.
 *
 * @react-navigation/bottom-tabs 미설치(신규 패키지 금지) 환경이라 진짜 탭 네비게이터 대신,
 * 기존 네이티브 스택을 유지한 채 허브 화면들에 부착해 navigation.navigate 로 전환한다.
 * (navigate 만 사용 — 이미 스택에 있으면 재사용되어 스택이 쌓이지 않고, reset 을 쓰지 않아
 *  뒤로가기 동작도 자연스럽다.)
 *
 * 탭 구성:
 *   MASTER  : 홈(MasterMyPageScreen) · 스케줄(StoreSchedule) · 급여(PayrollRun) · 매장(StoreDetail) · 알림(NotificationCenter)
 *   EMPLOYEE: 홈(EmployeeAttendanceHome) · 스케줄(MyShift) · 급여(SalaryArchive) · 계약서(MyContract) · 알림(NotificationCenter)
 *   그 외(개인/매니저): 렌더링하지 않음(null) — 이번 범위 밖.
 *
 * 사장 탭 중 storeId 가 필요한 화면(StoreSchedule/PayrollRun/StoreDetail)은 탭을 처음 누르는
 * 시점에 매장 목록을 lazy 조회(ref 캐시)해 첫 매장을 사용한다. 매장이 없으면 토스트 안내 후
 * StoreRegistration 으로 보낸다 (MasterMyPageScreen 의 requireStore 패턴과 동일).
 */
import React, {useRef} from 'react';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppToast, BottomTabBar} from '../ds';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useAuth} from '../../../contexts/AuthContext';
import {resolveUserGrade} from '../../../navigation/authFlow';
import storeService from '../../../features/store/services/storeService';

export type RoleTabKey = 'home' | 'schedule' | 'salary' | 'store' | 'contract' | 'notification';

interface TabDef {
    key: RoleTabKey;
    label: string;
    icon: string;
    screen: string;
    /** 사장 탭 — 첫 매장 storeId 를 params 로 넘겨야 하는 화면 */
    needsStoreId?: boolean;
}

const MASTER_TABS: TabDef[] = [
    {key: 'home', label: '홈', icon: 'home-outline', screen: 'MasterMyPageScreen'},
    {key: 'schedule', label: '스케줄', icon: 'calendar-outline', screen: 'StoreSchedule', needsStoreId: true},
    {key: 'salary', label: '급여', icon: 'card-outline', screen: 'PayrollRun', needsStoreId: true},
    {key: 'store', label: '매장', icon: 'storefront-outline', screen: 'StoreDetail', needsStoreId: true},
    {key: 'notification', label: '알림', icon: 'notifications-outline', screen: 'NotificationCenter'},
];

const EMPLOYEE_TABS: TabDef[] = [
    {key: 'home', label: '홈', icon: 'home-outline', screen: 'EmployeeAttendanceHome'},
    {key: 'schedule', label: '스케줄', icon: 'calendar-outline', screen: 'MyShift'},
    {key: 'salary', label: '급여', icon: 'wallet-outline', screen: 'SalaryArchive'},
    {key: 'contract', label: '계약서', icon: 'document-text-outline', screen: 'MyContract'},
    {key: 'notification', label: '알림', icon: 'notifications-outline', screen: 'NotificationCenter'},
];

interface RoleTabBarProps {
    /** 현재 활성 탭 키 */
    active: RoleTabKey | string;
}

export const RoleTabBar: React.FC<RoleTabBarProps> = ({active}) => {
    const navigation = useNavigation<NavigationProp<any>>();
    const {user} = useAuth();
    const c = useThemeColors();

    // 사장 첫 매장 id — 탭을 처음 누르는 시점에만 조회해 캐시 (렌더 지연/불필요 API 호출 방지).
    // undefined = 미조회, null = 매장 없음.
    const masterStoreIdRef = useRef<number | null | undefined>(undefined);
    const busyRef = useRef(false);

    const grade = resolveUserGrade(user);
    const tabs = grade === 'MASTER' ? MASTER_TABS : grade === 'EMPLOYEE' ? EMPLOYEE_TABS : null;
    if (!user || !tabs) {
        return null;
    }

    const activeIndex = tabs.findIndex(tab => tab.key === active);

    const resolveMasterStoreId = async (): Promise<number | null> => {
        if (masterStoreIdRef.current !== undefined) {
            return masterStoreIdRef.current;
        }
        const stores = await storeService.getMasterStores(user.id);
        masterStoreIdRef.current = stores[0]?.id ?? null;
        return masterStoreIdRef.current;
    };

    const handleTabPress = async (index: number) => {
        const tab = tabs[index];
        if (!tab || tab.key === active) {
            return;
        }
        if (!tab.needsStoreId) {
            navigation.navigate(tab.screen);
            return;
        }
        if (busyRef.current) {
            return;
        }
        busyRef.current = true;
        try {
            const storeId = await resolveMasterStoreId();
            if (storeId === null) {
                AppToast.show('먼저 매장을 등록해 주세요.');
                navigation.navigate('StoreRegistration');
                return;
            }
            navigation.navigate(tab.screen, {storeId});
        } catch {
            AppToast.error('매장 정보를 불러오지 못했어요.');
        } finally {
            busyRef.current = false;
        }
    };

    return (
        <BottomTabBar
            active={activeIndex}
            labels={tabs.map(tab => tab.label)}
            icons={tabs.map((tab, i) => (
                <Ionicons
                    key={tab.key}
                    name={tab.icon}
                    size={20}
                    color={i === activeIndex ? c.brandPrimary : c.textTertiary}
                />
            ))}
            onTabPress={handleTabPress}
        />
    );
};

export default RoleTabBar;
