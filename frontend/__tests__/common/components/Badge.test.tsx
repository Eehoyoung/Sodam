import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
}));

jest.mock('../../../src/theme/tokens', () => ({
    tokens: {
        colors: {
            brandPrimaryDark: '#C2410C',
            successBg: '#DCFCE7',
            success: '#16A34A',
            warningBg: '#FEF9C3',
            warning: '#CA8A04',
            errorBg: '#FEE2E2',
            error: '#DC2626',
            infoBg: '#DBEAFE',
            info: '#2563EB',
            surfaceMuted: '#F3F4F6',
            textSecondary: '#374151',
        },
        radius: {pill: 999},
    },
}));

import Badge from '../../../src/common/components/data-display/Badge';

const TYPE_BG: Record<string, string> = {
    primary: '#FFEEDC',
    success: '#DCFCE7',
    warning: '#FEF9C3',
    danger: '#FEE2E2',
    info: '#DBEAFE',
    neutral: '#F3F4F6',
};

const TYPE_FG: Record<string, string> = {
    primary: '#C2410C',
    success: '#16A34A',
    warning: '#CA8A04',
    danger: '#DC2626',
    info: '#2563EB',
    neutral: '#374151',
};

describe('Badge (common/data-display/Badge)', () => {
    test('text prop 렌더링', () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        act(() => {
            renderer = ReactTestRenderer.create(<Badge text="이용 중" />);
        });
        const text = renderer!.root.findByType('Text');
        expect(text.props.children).toBe('이용 중');
    });

    test.each([
        ['primary'],
        ['success'],
        ['warning'],
        ['danger'],
        ['info'],
        ['neutral'],
    ])('type=%s 컬러 매핑', type => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        act(() => {
            renderer = ReactTestRenderer.create(<Badge text="X" type={type as any} />);
        });
        const view = renderer!.root.findByType('View');
        const styleArr = view.props.style as any[];
        const flat = Object.assign({}, ...styleArr.filter(Boolean));
        expect(flat.backgroundColor).toBe(TYPE_BG[type]);
        const text = renderer!.root.findByType('Text');
        const tStyleArr = text.props.style as any[];
        const tFlat = Object.assign({}, ...tStyleArr.filter(Boolean));
        expect(tFlat.color).toBe(TYPE_FG[type]);
    });

    test('size=small/medium/large 패딩 차이', () => {
        const cases: Array<{size: 'small' | 'medium' | 'large'; v: number; h: number; fs: number}> = [
            {size: 'small', v: 2, h: 6, fs: 10},
            {size: 'medium', v: 4, h: 10, fs: 12},
            {size: 'large', v: 6, h: 14, fs: 13},
        ];
        for (const c of cases) {
            let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
            act(() => {
                renderer = ReactTestRenderer.create(<Badge text="X" size={c.size} />);
            });
            const view = renderer!.root.findByType('View');
            const styleArr = view.props.style as any[];
            const flat = Object.assign({}, ...styleArr.filter(Boolean));
            expect(flat.paddingVertical).toBe(c.v);
            expect(flat.paddingHorizontal).toBe(c.h);

            const text = renderer!.root.findByType('Text');
            const tStyleArr = text.props.style as any[];
            const tFlat = Object.assign({}, ...tStyleArr.filter(Boolean));
            expect(tFlat.fontSize).toBe(c.fs);
        }
    });
});
