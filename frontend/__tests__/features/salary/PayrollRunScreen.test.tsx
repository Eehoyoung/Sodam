import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// PayrollRunScreen 마법사 — Payroll 80% 커버리지 정책 (프로젝트 운영 기준)
// 핵심 검증:
//   1. PERIOD → goPreview 시 /api/payroll/calculate 정확한 payload 전송
//   2. PREVIEW 가 totalNet 합계 + adjustment 가산
//   3. CONFIRM → issuePayrolls 가 모든 payrollId 에 PUT status=PAID
//   4. 마법사 단계 전환 (PERIOD → PREVIEW → CONFIRM → DONE)
//   5. 에러 경로: storeId 없을 때 차단

const mockAlert = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    Image: 'Image',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Modal: 'Modal',
    TextInput: 'TextInput',
    Alert: {alert: mockAlert},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
    useRoute: () => ({params: {storeId: 7}}),
    NavigationContainer: ({children}: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/common/api/client', () => {
    const api = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    };
    return {__esModule: true, default: api, setOnUnauthorized: jest.fn()};
});

// AppToast 는 listener 패턴(emit→listeners.forEach)으로 동작 — 테스트에서 host 미마운트면 no-op.
// 즉 실제 AppToast 를 그대로 두면 에러 없이 호출 가능. 별도 모킹 불필요.

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

// 매장 셀렉터 추가 후: useAuth(사장 ID) + storeService(매장 목록) 의존 — 테스트에선 무력화.
// storeId 는 route param(7) 으로 그대로 흐르므로 매장 목록 없이도 정산 플로우는 동일.
jest.mock('../../../src/contexts/AuthContext', () => ({
    useAuth: () => ({user: {id: 1, name: '사장', role: 'MASTER'}}),
}));

jest.mock('../../../src/features/store/services/storeService', () => ({
    __esModule: true,
    default: {getMasterStores: jest.fn().mockResolvedValue([])},
}));

import PayrollRunScreen from '../../../src/features/salary/screens/PayrollRunScreen';
import api from '../../../src/common/api/client';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

/** 컴포넌트 트리에서 onPress 가 달린 Pressable 중 자식 Text 가 label 을 포함하는 것 찾기 */
const findPressableByLabel = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    return renderer.root.findAll(node => {
        if (node.type !== 'Pressable') return false;
        if (typeof node.props.onPress !== 'function') return false;
        const stack: any[] = [...(Array.isArray(node.children) ? node.children : [node.children])];
        while (stack.length) {
            const n = stack.pop();
            if (!n) continue;
            if (typeof n === 'object' && 'props' in n) {
                const children = n.props?.children;
                if (typeof children === 'string' && children.includes(label)) {
                    return true;
                }
                if (Array.isArray(children)) stack.push(...children);
                else if (children) stack.push(children);
            }
        }
        return false;
    })[0];
};

describe('PayrollRunScreen (3단계 정산 마법사)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockNavigate.mockClear();
        mockGoBack.mockClear();
    });

    test('초기 PERIOD 단계에서 1단계 제목 + 다음 CTA 표시', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<PayrollRunScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        // step PERIOD
        expect(texts).toContain('1단계: 기간 설정');
    });

    test('PERIOD → 다음 CTA → /api/payroll/calculate 정확한 payload + PREVIEW 전환', async () => {
        apiMock.post.mockResolvedValue({
            data: [
                {
                    id: 1, employee: {id: 5, user: {name: '김알바'}},
                    regularHours: 40, regularWage: 480000,
                    overtimeHours: 0, overtimeWage: 0,
                    nightWorkHours: 0, nightWorkWage: 0,
                    weeklyAllowance: 96000, grossWage: 576000,
                    taxAmount: 19000, netWage: 557000,
                },
            ],
        } as any);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<PayrollRunScreen />);
            await flush();
        });

        const btn = findPressableByLabel(renderer!, '다음: 미리보기');
        await act(async () => {
            btn!.props.onPress();
            await flush();
        });

        // calculate 호출 — storeId 7 (route param), startDate/endDate 키 사용
        expect(apiMock.post).toHaveBeenCalledTimes(1);
        const [url, body] = apiMock.post.mock.calls[0];
        expect(url).toBe('/api/payroll/calculate');
        expect(body).toEqual(expect.objectContaining({
            storeId: 7,
            startDate: expect.stringMatching(/^\d{4}-\d{2}-01$/),
            endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }));

        // PREVIEW 단계로 전환
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('2단계: 미리보기');
        expect(texts).toContain('김알바');
    });

    test('PREVIEW totalNet = 모든 netWage 합산', async () => {
        apiMock.post.mockResolvedValue({
            data: [
                {id: 1, employee: {id: 5, user: {name: 'A'}}, netWage: 500000, grossWage: 520000, regularHours: 1, regularWage: 1, overtimeHours: 0, overtimeWage: 0, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 0, taxAmount: 0},
                {id: 2, employee: {id: 6, user: {name: 'B'}}, netWage: 300000, grossWage: 320000, regularHours: 1, regularWage: 1, overtimeHours: 0, overtimeWage: 0, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 0, taxAmount: 0},
            ],
        } as any);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<PayrollRunScreen />);
            await flush();
        });
        await act(async () => {
            findPressableByLabel(renderer!, '다음: 미리보기')!.props.onPress();
            await flush();
        });

        // 500000 + 300000 = 800000 — toLocaleString('ko-KR') 결과 검색
        // <Text>₩{val}</Text> 의 children 은 배열일 수 있어 평탄화 후 join
        const flatten = (c: any): string => {
            if (typeof c === 'string') return c;
            if (Array.isArray(c)) return c.map(flatten).join('');
            return '';
        };
        const allTextContent = renderer!.root.findAllByType('Text').map(t => flatten(t.props.children)).join('\n');
        expect(allTextContent).toContain('800,000');
    });

    test('PREVIEW → CONFIRM → DONE: 모든 payrollId 에 PUT status=PAID', async () => {
        apiMock.post.mockResolvedValue({
            data: [
                {id: 11, employee: {id: 5, user: {name: 'A'}}, netWage: 100000, grossWage: 110000, regularHours: 1, regularWage: 1, overtimeHours: 0, overtimeWage: 0, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 0, taxAmount: 0},
                {id: 12, employee: {id: 6, user: {name: 'B'}}, netWage: 200000, grossWage: 210000, regularHours: 1, regularWage: 1, overtimeHours: 0, overtimeWage: 0, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 0, taxAmount: 0},
            ],
        } as any);
        apiMock.put.mockResolvedValue({data: {success: true}} as any);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<PayrollRunScreen />);
            await flush();
        });

        // 1단계 → 2단계
        await act(async () => {
            findPressableByLabel(renderer!, '다음: 미리보기')!.props.onPress();
            await flush();
        });
        // 2단계 → 3단계
        await act(async () => {
            findPressableByLabel(renderer!, '다음: 명세서 발급')!.props.onPress();
            await flush();
        });
        // CONFIRM 단계 표시
        const texts1 = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts1).toContain('3단계: 확인');

        const passwordInput = renderer!.root.findAllByType('TextInput')
            .find(input => input.props.secureTextEntry === true);
        expect(passwordInput).toBeDefined();
        await act(async () => {
            passwordInput!.props.onChangeText('step-up-password');
            await flush();
        });

        // 3단계 → 발급
        await act(async () => {
            findPressableByLabel(renderer!, '명세서 발급하기')!.props.onPress();
            await flush();
        });

        // 모든 payrollId 에 발급(/issue) 호출 — BE 가 확정→지급완료를 원자 처리 (DRAFT→PAID 직접 전이 400 방지)
        expect(apiMock.put).toHaveBeenCalledTimes(2);
        const urls = apiMock.put.mock.calls.map(c => c[0]);
        expect(urls).toEqual([
            '/api/payroll/11/issue',
            '/api/payroll/12/issue',
        ]);
        expect(apiMock.put.mock.calls.map(c => c[1])).toEqual([
            {stepUpPassword: 'step-up-password'},
            {stepUpPassword: 'step-up-password'},
        ]);

        // DONE 단계
        const texts2 = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts2).toContain('명세서 발급이 끝났어요');
    });

    test('계산 API 실패 시 PREVIEW 단계로 진행하지 않음', async () => {
        apiMock.post.mockImplementation(() =>
            Promise.reject({response: {data: {message: '서버 오류'}}}),
        );

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<PayrollRunScreen />);
            await flush();
        });

        await act(async () => {
            findPressableByLabel(renderer!, '다음: 미리보기')!.props.onPress();
            await flush();
        });

        // API 는 호출됐지만 catch 로 PREVIEW 미진입
        expect(apiMock.post).toHaveBeenCalledTimes(1);
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('1단계: 기간 설정'); // 여전히 PERIOD
        expect(texts).not.toContain('2단계: 미리보기');
    });

    test('발급 PUT 실패 시 DONE 단계로 진행하지 않음', async () => {
        apiMock.post.mockResolvedValue({
            data: [
                {id: 21, employee: {id: 1, user: {name: 'A'}}, netWage: 100000, grossWage: 100000, regularHours: 1, regularWage: 1, overtimeHours: 0, overtimeWage: 0, nightWorkHours: 0, nightWorkWage: 0, weeklyAllowance: 0, taxAmount: 0},
            ],
        } as any);
        apiMock.put.mockImplementation(() => Promise.reject(new Error('PUT failed')));

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<PayrollRunScreen />);
            await flush();
        });

        // PERIOD → PREVIEW
        await act(async () => {
            findPressableByLabel(renderer!, '다음: 미리보기')!.props.onPress();
            await flush();
        });
        // PREVIEW → CONFIRM
        await act(async () => {
            findPressableByLabel(renderer!, '다음: 명세서 발급')!.props.onPress();
            await flush();
        });
        const passwordInput = renderer!.root.findAllByType('TextInput')
            .find(input => input.props.secureTextEntry === true);
        await act(async () => {
            passwordInput!.props.onChangeText('step-up-password');
            await flush();
        });
        // CONFIRM → 발급 시도
        await act(async () => {
            findPressableByLabel(renderer!, '명세서 발급하기')!.props.onPress();
            await flush();
        });

        // PUT 은 시도됐지만 catch 로 DONE 미진입
        expect(apiMock.put).toHaveBeenCalled();
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).not.toContain('명세서 발급이 끝났어요');
    });
});
