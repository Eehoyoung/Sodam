import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    TouchableOpacity: 'TouchableOpacity',
}));

jest.mock('../../../src/theme/tokens', () => ({
    tokens: {
        colors: {
            brandPrimary: '#FF6B35',
            border: '#E5E7EB',
            surface: '#FFFFFF',
            background: '#FFFFFF',
            surfaceMuted: '#F3F4F6',
            textPrimary: '#111827',
            textSecondary: '#374151',
            textTertiary: '#9CA3AF',
            error: '#DC2626',
        },
        spacing: {xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 20},
        radius: {lg: 10},
        typography: {
            sizes: {xs: 11, sm: 13, md: 15},
            weights: {semibold: '600'},
        },
    },
}));

import Input from '../../../src/common/components/form/Input';

const renderInput = (props: any) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    act(() => {
        renderer = ReactTestRenderer.create(<Input value="" onChangeText={() => {}} {...props} />);
    });
    return renderer!;
};

describe('Input (common/form/Input)', () => {
    test('label / placeholder 렌더링', () => {
        const renderer = renderInput({label: '이메일', placeholder: 'you@sodam.com'});
        const texts = renderer.root.findAllByType('Text');
        const labelFound = texts.some(n => {
            const c = n.props.children;
            return c === '이메일';
        });
        expect(labelFound).toBe(true);
        const input = renderer.root.findByType('TextInput');
        expect(input.props.placeholder).toBe('you@sodam.com');
    });

    test('onChangeText 호출', () => {
        const onChangeText = jest.fn();
        const renderer = renderInput({onChangeText});
        const input = renderer.root.findByType('TextInput');
        act(() => input.props.onChangeText('hello'));
        expect(onChangeText).toHaveBeenCalledWith('hello');
    });

    test('error prop 시 빨강 보더 + 에러 텍스트 표시', () => {
        const renderer = renderInput({error: '필수 입력값입니다'});
        // 에러 텍스트 노드 찾기
        const texts = renderer.root.findAllByType('Text');
        const hasErrorText = texts.some(n => n.props.children === '필수 입력값입니다');
        expect(hasErrorText).toBe(true);
        // 빨강 보더: inputContainer View 의 style 배열에 errorInput 객체가 들어감
        const views = renderer.root.findAllByType('View');
        const errorBorder = views.some(v => {
            const style = v.props.style;
            if (!Array.isArray(style)) return false;
            return style.some(
                (s: any) => s && s.borderColor === '#DC2626',
            );
        });
        expect(errorBorder).toBe(true);
    });

    test('secureTextEntry=true 시 "보기"/"숨기기" 토글 동작', () => {
        const renderer = renderInput({secureTextEntry: true});
        // 초기: 보기 (isPasswordVisible=!secureTextEntry → false → 표시 "보기")
        let texts = renderer.root.findAllByType('Text');
        let toggleText = texts.find(n => n.props.children === '보기' || n.props.children === '숨기기');
        expect(toggleText).toBeTruthy();
        expect(toggleText!.props.children).toBe('보기');

        // 누르면 "숨기기" 로 변경
        const toggleBtn = renderer.root.findByType('TouchableOpacity');
        act(() => toggleBtn.props.onPress());

        texts = renderer.root.findAllByType('Text');
        toggleText = texts.find(n => n.props.children === '보기' || n.props.children === '숨기기');
        expect(toggleText!.props.children).toBe('숨기기');
    });

    test('focus/blur 콜백 호출', () => {
        const onFocus = jest.fn();
        const onBlur = jest.fn();
        const renderer = renderInput({onFocus, onBlur});
        const input = renderer.root.findByType('TextInput');
        act(() => input.props.onFocus());
        act(() => input.props.onBlur());
        expect(onFocus).toHaveBeenCalledTimes(1);
        expect(onBlur).toHaveBeenCalledTimes(1);
    });
});
