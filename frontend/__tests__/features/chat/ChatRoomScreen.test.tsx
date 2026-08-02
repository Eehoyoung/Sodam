import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// ChatRoomScreen — 채용 채팅방(recruitment-monetization-gamification-plan.md §4, Phase D).
// 핵심 검증:
//   1. 매칭 컨텍스트 카드(매장·직무·시급) 고정 노출
//   2. mine/masked/시스템 메시지 구분 렌더
//   3. 메시지 전송 → useSendChatMessage 뮤테이션 호출 + 입력창 초기화
//   4. 빠른답장 칩 탭 → 즉시 전송
//   5. 메시지 롱프레스(상대 메시지만) → 신고 바텀시트 → 사유 선택 후 제출 → useReportChatMessage 호출
//   6. READ_ONLY 방 → 입력창 대신 안내 문구, 전송 시 CHAT_ROOM_READ_ONLY(409) → 로컬 상태 전환
//   7. 헤더 ⋮ → 차단 메뉴 → ConfirmSheet 확인 → useBlockChatUser 호출 + 뒤로가기
//   8. 실시간(WS) 수신 메시지 — 발신자 id 로 mine 을 재계산해 캐시에 병합한다

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSendMutateAsync = jest.fn();
const mockReportMutateAsync = jest.fn();
const mockBlockMutateAsync = jest.fn();
const mockSetQueryData = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockUseChatLiveSync = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    TextInput: 'TextInput',
    Modal: 'Modal',
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
        useRoute: () => ({
            params: {
                roomId: 1,
                room: {
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
                    lastMessagePreview: null,
                    lastMessageAt: null,
                    unreadCount: 0,
                    matchedAt: '2026-08-01T09:00:00',
                },
            },
        }),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('@tanstack/react-query', () => {
    // 실제 모듈을 베이스로 useQueryClient 만 교체한다 — `common/query/client.ts` 가 모듈 로드
    // 시점에 `new QueryClient(...)`을 호출하므로(useChatQueries.ts → common/query/errorHandler.ts
    // → common/query/client.ts 임포트 체인), QueryClient 클래스 자체는 실제 구현이 남아 있어야 한다.
    const actual = jest.requireActual('@tanstack/react-query');
    return {
        ...actual,
        useQueryClient: () => ({setQueryData: mockSetQueryData, invalidateQueries: mockInvalidateQueries}),
    };
});

jest.mock('../../../src/contexts/AuthContext', () => ({
    useAuth: () => ({user: {id: 1, name: '사장님'}}),
}));

jest.mock('../../../src/common/realtime/useChatLiveSync', () => ({
    useChatLiveSync: (...args: any[]) => mockUseChatLiveSync(...args),
}));

const messagesState: {data: any[]; isLoading: boolean} = {data: [], isLoading: false};

jest.mock('../../../src/features/chat/hooks/useChatQueries', () => {
    const actual = jest.requireActual('../../../src/features/chat/hooks/useChatQueries');
    return {
        chatQueryKeys: actual.chatQueryKeys,
        mergeIncomingChatMessage: actual.mergeIncomingChatMessage,
        useChatMessages: () => ({data: messagesState.data, isLoading: messagesState.isLoading}),
        useSendChatMessage: () => ({mutateAsync: mockSendMutateAsync, isPending: false}),
        useReportChatMessage: () => ({mutateAsync: mockReportMutateAsync, isPending: false}),
        useBlockChatUser: () => ({mutateAsync: mockBlockMutateAsync, isPending: false}),
    };
});

import ChatRoomScreen from '../../../src/features/chat/screens/ChatRoomScreen';
import {ConfirmSheet} from '../../../src/common/components/ds';

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

function makeMessage(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        chatRoomId: 1,
        senderUserId: 5,
        senderName: '김민서',
        messageType: 'USER',
        content: '안녕하세요',
        masked: false,
        mine: false,
        sentAt: '2026-08-02T14:02:00',
        readAt: null,
        ...overrides,
    };
}

describe('ChatRoomScreen', () => {
    let activeRenderer: ReactTestRenderer.ReactTestRenderer | null = null;

    beforeEach(() => {
        jest.clearAllMocks();
        messagesState.data = [];
        messagesState.isLoading = false;
        mockSendMutateAsync.mockResolvedValue(makeMessage({id: 99, mine: true}));
        mockReportMutateAsync.mockResolvedValue(undefined);
        mockBlockMutateAsync.mockResolvedValue(undefined);
    });

    afterEach(() => {
        act(() => {
            activeRenderer?.unmount();
        });
        activeRenderer = null;
    });

    test('매칭 컨텍스트 카드가 매장·직무·시급을 보여준다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const texts = renderer!.root
            .findAllByType('Text')
            .map(t => t.props.children)
            .flat()
            .filter(t => typeof t === 'string');
        expect(texts.some(t => t.includes('소담커피 서면점'))).toBe(true);
        // AppText 는 여러 `{...}` 보간을 별개의 children 배열 요소로 갖는다(자동 문자열 결합 없음) —
        // "12,000" 과 "원" 이 별개 조각으로 존재하는지 각각 확인한다.
        expect(texts.some(t => t.includes('12,000'))).toBe(true);
        expect(texts.some(t => t.includes('원'))).toBe(true);
    });

    test('mine/theirs/시스템 메시지를 구분해서 렌더한다', async () => {
        messagesState.data = [
            {...makeMessage({id: 1, mine: false, senderName: '김민서'})},
            {...makeMessage({id: 2, mine: true, senderUserId: 1, content: '네 반가워요', readAt: null})},
            {
                id: 3,
                chatRoomId: 1,
                senderUserId: null,
                senderName: null,
                messageType: 'SYSTEM',
                content: '지원서를 열람하고 채팅방을 시작했어요.',
                masked: false,
                mine: false,
                sentAt: '2026-08-02T14:00:00',
                readAt: null,
            },
        ];

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        expect(() => findHostByTestId(renderer!, 'chat-message-bubble-1')).not.toThrow();
        expect(() => findHostByTestId(renderer!, 'chat-message-bubble-2')).not.toThrow();
        expect(() => findHostByTestId(renderer!, 'chat-message-system-3')).not.toThrow();
    });

    test('masked=true 메시지에는 안내 배지가 표시된다', async () => {
        messagesState.data = [makeMessage({id: 5, masked: true, content: '010-****-****로 연락주세요'})];

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        expect(() => findHostByTestId(renderer!, 'chat-message-mask-note-5')).not.toThrow();
    });

    test('메시지 전송 → useSendChatMessage 가 호출되고 입력창이 초기화된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const input = findHostByTestId(renderer!, 'chat-message-input');
        await act(async () => {
            input.props.onChangeText('화~금 저녁 가능해요');
            await flush();
        });

        const sendButton = findHostByTestId(renderer!, 'chat-send-button');
        await act(async () => {
            sendButton.props.onPress();
            await flush();
        });

        expect(mockSendMutateAsync).toHaveBeenCalledWith('화~금 저녁 가능해요');
    });

    test('빠른답장 칩 탭 → 즉시 전송된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const chip = findHostByTestId(renderer!, 'chat-quick-reply-네 좋습니다 👍');
        await act(async () => {
            chip.props.onPress();
            await flush();
        });

        expect(mockSendMutateAsync).toHaveBeenCalledWith('네 좋습니다 👍');
    });

    test('상대 메시지 롱프레스 → 신고 바텀시트 → 사유 선택 후 제출', async () => {
        messagesState.data = [makeMessage({id: 7, mine: false})];

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const bubble = findHostByTestId(renderer!, 'chat-message-bubble-7');
        await act(async () => {
            bubble.props.onLongPress();
            await flush();
        });

        const fraudOption = findHostByTestId(renderer!, 'chat-report-option-FRAUD_SUSPECTED');
        await act(async () => {
            fraudOption.props.onPress();
            await flush();
        });

        const submitButton = findHostByTestId(renderer!, 'chat-report-submit-button');
        await act(async () => {
            submitButton.props.onPress();
            await flush();
        });

        expect(mockReportMutateAsync).toHaveBeenCalledWith({messageId: 7, reason: 'FRAUD_SUSPECTED'});
    });

    test('내가 보낸 메시지는 롱프레스로 신고할 수 없다(onLongPress 미배선)', async () => {
        messagesState.data = [makeMessage({id: 8, mine: true, senderUserId: 1})];

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const bubble = findHostByTestId(renderer!, 'chat-message-bubble-8');
        expect(bubble.props.onLongPress).toBeUndefined();
    });

    test('전송 실패(409 CHAT_ROOM_READ_ONLY) → 로컬 상태가 읽기 전용으로 전환된다', async () => {
        mockSendMutateAsync.mockRejectedValueOnce({
            response: {status: 409, data: {errorCode: 'CHAT_ROOM_READ_ONLY', message: '이 채팅방은 읽기 전용이에요.'}},
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const input = findHostByTestId(renderer!, 'chat-message-input');
        await act(async () => {
            input.props.onChangeText('늦었지만 답장이에요');
            await flush();
        });
        const sendButton = findHostByTestId(renderer!, 'chat-send-button');
        await act(async () => {
            sendButton.props.onPress();
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'chat-room-readonly-notice')).not.toThrow();
        expect(renderer!.root.findAllByProps({testID: 'chat-message-input'})).toHaveLength(0);
    });

    test('헤더 ⋮ → 차단 메뉴 → 확인 시 차단 처리 후 뒤로가기', async () => {
        const confirmSpy = jest.spyOn(ConfirmSheet, 'confirm');

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const menuButton = renderer!.root
            .findAllByProps({accessibilityLabel: '더보기'})
            .find(n => typeof n.props.onPress === 'function');
        await act(async () => {
            menuButton!.props.onPress();
            await flush();
        });

        const blockMenuItem = findHostByTestId(renderer!, 'chat-room-block-menu-item');
        await act(async () => {
            blockMenuItem.props.onPress();
            await flush();
        });

        expect(confirmSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                title: expect.stringContaining('김민서'),
                primary: expect.objectContaining({label: '차단하기', destructive: true}),
            }),
        );

        // 사용자가 바텀시트에서 "차단하기"를 눌렀다고 가정하고 캡처한 콜백을 직접 실행한다.
        const opts = confirmSpy.mock.calls[0][0];
        await act(async () => {
            await opts.primary.onPress?.();
            await flush();
        });

        expect(mockBlockMutateAsync).toHaveBeenCalledWith(5);
        expect(mockGoBack).toHaveBeenCalled();

        confirmSpy.mockRestore();
    });

    test('실시간(WS) 수신 메시지 — 상대가 보낸 메시지는 mine=false 로 캐시에 병합된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        expect(mockUseChatLiveSync).toHaveBeenCalled();
        const [roomIdArg, callback] = mockUseChatLiveSync.mock.calls[0];
        expect(roomIdArg).toBe(1);

        await act(async () => {
            callback({
                id: 42,
                chatRoomId: 1,
                senderUserId: 5,
                senderName: '김민서',
                messageType: 'USER',
                content: '몇 시까지 가면 될까요?',
                masked: false,
                mine: false,
                sentAt: '2026-08-02T15:00:00',
                readAt: null,
            });
        });

        expect(mockSetQueryData).toHaveBeenCalledWith(['chat', 'messages', 1], expect.any(Function));
        const updater = mockSetQueryData.mock.calls[0][1];
        const merged = updater([]);
        expect(merged).toEqual([
            expect.objectContaining({id: 42, senderUserId: 5, mine: false, content: '몇 시까지 가면 될까요?'}),
        ]);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({queryKey: ['chat', 'rooms']});
    });

    test('실시간(WS) 수신 메시지 — 내 senderUserId 와 일치하면 mine=true 로 재계산된다(다른 기기에서 보낸 내 메시지)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ChatRoomScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const [, callback] = mockUseChatLiveSync.mock.calls[0];

        await act(async () => {
            callback({
                id: 43,
                chatRoomId: 1,
                senderUserId: 1, // 현재 로그인 사용자(user.id=1)와 동일 — WS payload.mine 은 신뢰하지 않는다.
                senderName: '사장님',
                messageType: 'USER',
                content: '다른 기기에서 보낸 메시지',
                masked: false,
                mine: false, // 발행 시점(수신자 관점)엔 항상 false로 온다.
                sentAt: '2026-08-02T15:01:00',
                readAt: null,
            });
        });

        const updater = mockSetQueryData.mock.calls[0][1];
        const merged = updater([]);
        expect(merged).toEqual([expect.objectContaining({id: 43, mine: true})]);
    });
});
