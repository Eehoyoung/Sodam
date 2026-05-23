import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
}));

jest.mock('../../../src/theme/tokens', () => ({
    tokens: {
        colors: {
            surface: '#FFFFFF',
            divider: '#E5E7EB',
            textPrimary: '#111827',
            textSecondary: '#374151',
        },
        spacing: {sm: 4, md: 8, lg: 12},
        radius: {lg: 10},
        typography: {
            sizes: {sm: 13, lg: 17},
            weights: {bold: '700'},
        },
        shadow: {sm: {elev: 1}, md: {elev: 2}, lg: {elev: 3}},
    },
}));

import Card from '../../../src/common/components/data-display/Card';

describe('Card (common/data-display/Card)', () => {
    test('title / subtitle / children 렌더링', () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        act(() => {
            renderer = ReactTestRenderer.create(
                <Card title="제목" subtitle="부제목">
                    <></>
                </Card>,
            );
        });
        const texts = renderer!.root.findAllByType('Text');
        const found = texts.map(t => t.props.children);
        expect(found).toContain('제목');
        expect(found).toContain('부제목');
    });

    test('onPress 있을 때 Pressable, 없을 때 View', () => {
        let withPress: ReactTestRenderer.ReactTestRenderer | null = null;
        let withoutPress: ReactTestRenderer.ReactTestRenderer | null = null;
        act(() => {
            withPress = ReactTestRenderer.create(
                <Card onPress={() => {}}>
                    <></>
                </Card>,
            );
            withoutPress = ReactTestRenderer.create(
                <Card>
                    <></>
                </Card>,
            );
        });
        expect(withPress!.root.findAllByType('Pressable').length).toBe(1);
        expect(withoutPress!.root.findAllByType('Pressable').length).toBe(0);
        // 루트가 View
        expect(withoutPress!.root.findAllByType('View').length).toBeGreaterThan(0);
    });

    test('bordered=true 시 borderWidth 적용', () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        act(() => {
            renderer = ReactTestRenderer.create(
                <Card bordered>
                    <></>
                </Card>,
            );
        });
        const rootView = renderer!.root.findByType('View');
        const styleArr = rootView.props.style as any[];
        const flat = Array.isArray(styleArr) ? Object.assign({}, ...styleArr.filter(Boolean)) : styleArr;
        expect(flat.borderWidth).toBe(1);
    });

    test('footer 렌더링', () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        const footerNode = <></>;
        act(() => {
            renderer = ReactTestRenderer.create(
                <Card footer={<>{'F'}</>}>
                    <></>
                </Card>,
            );
        });
        const texts = renderer!.root.findAllByType('Text');
        // footer 가 string 으로 들어가면 텍스트 노드가 됨. 여기선 footer 가 fragment 라 View 가 추가됨을 확인
        const views = renderer!.root.findAllByType('View');
        // header(없음) + content + footer 최소 2개 + 루트
        expect(views.length).toBeGreaterThanOrEqual(3);
    });
});
