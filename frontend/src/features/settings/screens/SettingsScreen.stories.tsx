import React from 'react';
import type {Meta, StoryObj} from '@storybook/react-native-web-vite';
import {AuthContext, AuthContextType} from '../../../contexts/AuthContext';
import SettingsScreen from './SettingsScreen';

/**
 * 화면(screens) 단위 스토리 첫 사례.
 *
 * 실제 AuthProvider는 로그인 mutation·FCM 등록·페이월(PaywallHost) 등 실 네트워크에
 * 의존하는 무거운 로직을 갖고 있어 Storybook에서 그대로 쓰기 어렵다. 대신 AuthContext.tsx가
 * export하는 Context 객체를 직접 mock 값으로 감싸 화면을 그대로 렌더링한다(화면 코드 변경 없음).
 *
 * 다음 화면을 스토리로 추가할 때 이 패턴을 재사용하면 된다:
 *   1. 화면이 호출하는 서비스가 없거나(useAuth/useNavigation 정도만) 적은 화면부터 고른다.
 *   2. 이 파일처럼 AuthContext를 mock 값으로 감싼다(NavigationContainer/QueryClientProvider는
 *      .storybook/preview.tsx에 이미 전역 데코레이터로 있어 별도 작업 불필요).
 *   3. 화면이 route.params나 자체 서비스 호출을 한다면 그만큼 mock이 더 필요해진다 —
 *      EmployeeAttendanceHome처럼 서비스 8~9개를 직접 호출하는 화면은 MSW(Mock Service Worker)
 *      같은 네트워크 레벨 mock이 선행돼야 한다(아직 미도입, 다음 단계 후보).
 */
const mockAuth = (overrides: Partial<AuthContextType>): AuthContextType => ({
    isAuthenticated: true,
    user: {
        id: 1,
        name: '김소담',
        email: 'sodam@example.com',
        role: 'EMPLOYEE',
    },
    loading: false,
    login: async () => { throw new Error('storybook mock: not implemented'); },
    logout: async () => {},
    kakaoLogin: async () => { throw new Error('storybook mock: not implemented'); },
    appleLogin: async () => { throw new Error('storybook mock: not implemented'); },
    ...overrides,
});

const meta: Meta<typeof SettingsScreen> = {
    title: 'Screens/SettingsScreen',
    component: SettingsScreen,
};

export default meta;
type Story = StoryObj<typeof SettingsScreen>;

/** 직원 계정 — 구독/결제·친구 초대 항목은 사장 전용이라 보이지 않는다. */
export const AsEmployee: Story = {
    render: () => (
        <AuthContext.Provider value={mockAuth({
            user: {id: 3, name: '김직원', email: 'employee@sodam.example', role: 'EMPLOYEE'},
        })}>
            <SettingsScreen />
        </AuthContext.Provider>
    ),
};

/** 사장 계정 — 구독/결제·친구 초대 항목이 추가로 보인다. */
export const AsMaster: Story = {
    render: () => (
        <AuthContext.Provider value={mockAuth({
            user: {id: 1, name: '박사장', email: 'master@sodam.example', role: 'MASTER'},
        })}>
            <SettingsScreen />
        </AuthContext.Provider>
    ),
};
