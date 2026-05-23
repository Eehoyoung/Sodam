import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// react-native mock 확장: Pressable, ActivityIndicator 가 jest.setup.js mock 에 없으므로 보강
jest.mock('react-native', () => {
    const base = jest.requireActual('react-native');
    // 우리는 jest.setup.js 에서 이미 base 가 객체로 치환되어 있음. 다시 보강한다.
    return {
        StyleSheet: {create: (s: any) => s},
        View: 'View',
        Text: 'Text',
        Pressable: 'Pressable',
        TouchableOpacity: 'TouchableOpacity',
        ActivityIndicator: 'ActivityIndicator',
        Platform: {OS: 'ios', select: (o: any) => o.ios},
    };
});

// tokens 안전 모킹 (shadow.brand 등 의존성 단순화)
jest.mock('../../../src/theme/tokens', () => ({
    tokens: {
        colors: {
            brandPrimary: '#FF6B35',
            brandSecondary: '#222',
            textInverse: '#fff',
            error: '#E53E3E',
            surfaceMuted: '#F3F4F6',
            border: '#E5E7EB',
        },
        spacing: {sm: 4, md: 8, lg: 12, xl: 16, xxl: 20, xxxl: 24, huge: 40, xs: 2},
        radius: {md: 6, lg: 10, xl: 14, pill: 999},
        typography: {
            sizes: {sm: 13, md: 15, lg: 17, xl: 19, xxl: 22, display: 28, xs: 11},
            weights: {semibold: '600', bold: '700'},
        },
        shadow: {brand: {shadowColor: '#FF6B35'}, sm: {}, md: {}, lg: {}},
    },
}));

import Button from '../../../src/common/components/form/Button';

const renderButton = (props: any) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    act(() => {
        renderer = ReactTestRenderer.create(<Button {...props} />);
    });
    return renderer!;
};

describe('Button (common/form/Button)', () => {
    test.each([
        ['primary'],
        ['secondary'],
        ['outline'],
        ['ghost'],
        ['destructive'],
    ])('variant=%s 렌더링', variant => {
        const renderer = renderButton({title: '확인', onPress: jest.fn(), variant});
        const tree = renderer.toJSON();
        expect(tree).toBeTruthy();
        // Pressable 루트 + style 배열에 variant 컨테이너가 적용된다
        const root = renderer.root.findByType('Pressable');
        expect(root).toBeTruthy();
    });

    test('size=sm/md/lg minHeight 차이', () => {
        const sizes: Array<['sm' | 'md' | 'lg', number]> = [
            ['sm', 36],
            ['md', 48],
            ['lg', 56],
        ];
        for (const [size, expected] of sizes) {
            const renderer = renderButton({title: 'X', onPress: jest.fn(), size});
            const pressable = renderer.root.findByType('Pressable');
            // style 은 함수 (Pressable 의 style={({pressed}) => [...]}) → 호출 후 평탄화
            const styleFn = pressable.props.style;
            const styles = (typeof styleFn === 'function' ? styleFn({pressed: false}) : styleFn) as any[];
            const merged = Object.assign({}, ...styles.filter(Boolean));
            expect(merged.minHeight).toBe(expected);
        }
    });

    test('loading=true 시 ActivityIndicator 표시', () => {
        const renderer = renderButton({title: '로딩', onPress: jest.fn(), loading: true});
        const indicators = renderer.root.findAllByType('ActivityIndicator');
        expect(indicators.length).toBe(1);
    });

    test('disabled=true 시 onPress 가 무시된다 (accessibilityState.disabled=true)', () => {
        const onPress = jest.fn();
        const renderer = renderButton({title: '비활성', onPress, disabled: true});
        const pressable = renderer.root.findByType('Pressable');
        expect(pressable.props.disabled).toBe(true);
        expect(pressable.props.accessibilityState?.disabled).toBe(true);
    });

    test('press 시 onPress 콜백 호출', () => {
        const onPress = jest.fn();
        const renderer = renderButton({title: '확인', onPress});
        const pressable = renderer.root.findByType('Pressable');
        act(() => pressable.props.onPress());
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    test('fullWidth=true 시 width:"100%" 적용', () => {
        const renderer = renderButton({title: 'F', onPress: jest.fn(), fullWidth: true});
        const pressable = renderer.root.findByType('Pressable');
        const styles = (pressable.props.style({pressed: false}) as any[]).filter(Boolean);
        const merged = Object.assign({}, ...styles);
        expect(merged.width).toBe('100%');
    });
});
