import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import SodamLandingScreen from '../../src/features/welcome/screens/SodamLandingScreen';

/**
 * 랜딩 화면의 진입 분기 검증 (Welcome → Auth).
 *
 * <p>랜딩에는 목적이 다른 CTA 가 셋 있고, 잘못 이어지면 신규 사용자가 역할 선택을 건너뛰거나
 * 기존 사용자가 가입 흐름으로 빠진다. 화면에 보이는 라벨로 눌러 목적지를 확인한다.</p>
 *
 * <p>이전 버전은 react-test-renderer 로 {@code node.type === 'TouchableOpacity'} 를 찾고
 * "시작하기 → Login" 을 단언했는데, 그 계약은 이미 사라졌다(현재는 "무료로 시작하기 → RoleStart").
 * 내부 구현 타입을 뒤지는 대신 RTL 실렌더링으로 다시 썼다.</p>
 */

const mockNavigate = jest.fn();

// 이 화면은 navigation 을 훅이 아니라 prop 으로 받는다(NavigationProp<RootStackParamList>).
const renderLanding = () =>
    render(<SodamLandingScreen navigation={{navigate: mockNavigate} as any} />);

describe('랜딩 화면 진입 분기', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('핵심 가치 문구와 CTA 3종을 보여준다', () => {
        const {getByText} = renderLanding();

        expect(getByText('월말 정산이\n30분 안에 끝나요')).toBeTruthy();
        expect(getByText('무료로 시작하기')).toBeTruthy();
        expect(getByText('이미 계정이 있어요')).toBeTruthy();
    });

    it('"무료로 시작하기"는 로그인이 아니라 역할 선택으로 보낸다', () => {
        const {getByText} = renderLanding();

        fireEvent.press(getByText('무료로 시작하기'));

        // 역할(사장/직원)을 먼저 고르지 않으면 이후 가입 흐름이 갈라지지 않는다.
        expect(mockNavigate).toHaveBeenCalledWith('Auth', {screen: 'RoleStart'});
    });

    it('"이미 계정이 있어요"는 로그인으로 보낸다', () => {
        const {getByText} = renderLanding();

        fireEvent.press(getByText('이미 계정이 있어요'));

        expect(mockNavigate).toHaveBeenCalledWith('Auth', {screen: 'Login'});
    });

    it('헤더의 로그인 버튼도 로그인으로 보낸다', () => {
        const {getByLabelText} = renderLanding();

        fireEvent.press(getByLabelText('로그인'));

        expect(mockNavigate).toHaveBeenCalledWith('Auth', {screen: 'Login'});
    });
});
