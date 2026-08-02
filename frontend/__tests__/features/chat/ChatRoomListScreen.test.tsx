import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// ChatRoomListScreen — 채용 채팅 목록(recruitment-monetization-gamification-plan.md §4, Phase D).
// 핵심 검증:
//   1. 목록 렌더 — 상대 이름/매장명/직무/시급 요약/마지막 메시지 미리보기/안읽음 배지
//   2. READ_ONLY 방은 회색 처리("읽기 전용" 뱃지, 안읽음 배지 대신)
//   3. 빈 상태
//   4. 카드 탭 → ChatRoom push (roomId + room 객체 그대로 전달)
//   5. 포커스마다 refetch (독립 push 라우트라 useFocusEffect 패턴)

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRefetch = jest.fn();
const mockUseMyChatRooms = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/features/chat/hooks/useChatQueries', () => ({
    useMyChatRooms: (...args: any[]) => mockUseMyChatRooms(...args),
}));

import ChatRoomListScreen from '../../../src/features/chat/screens/ChatRoomListScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const findHostByTestId = (renderer: ReactTestRenderer.ReactTestRenderer, testID: string) => {
    const matches = renderer.root.findAllByProps({testID});
    const host = matches.find(n => typeof n.type === 'string');
    if (!host) {
        throw new Error(`host node with testID="${testID}" not found`);
    }
    return host;
};

function makeRoom(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        storeId: 7,
        storeName: '소담커피 서면점',
        counterpartUserId: 5,
        counterpartName: '김민서',
        workType: 'REGULAR',
        workDate: null,
        startTime: '18:00:00',
        endTime: '22:00:00',
        hourlyWage: 12000,
        status: 'ACTIVE',
        lastMessagePreview: '네 가능합니다!',
        lastMessageAt: '2026-08-02T14:05:00',
        unreadCount: 2,
        matchedAt: '2026-08-01T09:00:00',
        ...overrides,
    };
}

describe('ChatRoomListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseMyChatRooms.mockReturnValue({data: [], isLoading: false, isError: false, refetch: mockRefetch});
    });

    test('목록 렌더 — 상대 이름/매장명/미리보기/안읽음 배지 노출', async () => {
        mockUseMyChatRooms.mockReturnValue({
            data: [makeRoom()],
            isLoading: false,
            isError: false,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomListScreen />);
            await flush();
        });

        const texts = renderer!.root
            .findAllByType('Text')
            .map(t => t.props.children)
            .flat()
            .filter(t => typeof t === 'string');
        expect(texts.some(t => t.includes('김민서'))).toBe(true);
        expect(texts.some(t => t.includes('소담커피 서면점'))).toBe(true);
        expect(texts.some(t => t.includes('네 가능합니다!'))).toBe(true);
        expect(() => findHostByTestId(renderer!, 'chat-room-unread-1')).not.toThrow();
    });

    test('READ_ONLY 방은 "읽기 전용" 뱃지가 표시되고 안읽음 배지는 없다', async () => {
        mockUseMyChatRooms.mockReturnValue({
            data: [makeRoom({status: 'READ_ONLY', unreadCount: 3})],
            isLoading: false,
            isError: false,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomListScreen />);
            await flush();
        });

        const texts = renderer!.root
            .findAllByType('Text')
            .map(t => t.props.children)
            .flat()
            .filter(t => typeof t === 'string');
        expect(texts).toContain('읽기 전용');
        expect(renderer!.root.findAllByProps({testID: 'chat-room-unread-1'})).toHaveLength(0);
    });

    test('빈 상태', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomListScreen />);
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'chat-room-list-empty')).not.toThrow();
    });

    test('카드 탭 → ChatRoom push, roomId + room 객체를 그대로 전달한다', async () => {
        const room = makeRoom();
        mockUseMyChatRooms.mockReturnValue({data: [room], isLoading: false, isError: false, refetch: mockRefetch});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomListScreen />);
            await flush();
        });

        const card = findHostByTestId(renderer!, `chat-room-row-${room.id}`);
        await act(async () => {
            card.props.onPress();
            await flush();
        });

        expect(mockNavigate).toHaveBeenCalledWith('ChatRoom', {roomId: room.id, room});
    });

    test('화면 포커스마다 refetch 를 호출한다(독립 push 라우트, useFocusEffect 패턴)', async () => {
        await act(async () => {
            ReactTestRenderer.create(<ChatRoomListScreen />);
            await flush();
        });

        expect(mockRefetch).toHaveBeenCalled();
    });
});
