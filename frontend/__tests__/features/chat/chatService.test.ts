import {__testing__} from '../../../src/common/api/client';
import chatService from '../../../src/features/chat/services/chatService';

// axios-mock-adapter 가 없으면 최소 폴리필 (attendanceCreditService.test.ts 패턴과 동일)
let AxiosMockAdapter: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AxiosMockAdapter = require('axios-mock-adapter');
} catch (_) {
    AxiosMockAdapter = class {
        constructor(_instance: any) {}
        onGet() {
            return {replyOnce: () => this, reply: () => this};
        }
        onPost() {
            return {replyOnce: () => this, reply: () => this};
        }
        restore() {}
    };
}

// chatService — `ChatController`/`ChatModerationController` 정합 회귀 테스트
// (recruitment-monetization-gamification-plan.md §4, Phase D). 실제 axios 인스턴스에 HTTP 레이어를
// mock 해 백엔드 DTO(ChatRoomListItemResponse/ChatMessageResponse) 실제 응답 형태 그대로 파싱되는지
// 검증한다(화면 목데이터가 아니라 네트워크 레이어 자체를 검증).
describe('chatService', () => {
    let mock: any;

    beforeEach(() => {
        mock = new AxiosMockAdapter(__testing__.getClient());
    });

    afterEach(() => {
        mock.restore();
    });

    describe('getMyChatRooms', () => {
        it('GET /api/chat-rooms/me — 백엔드 응답 형태를 그대로 파싱한다', async () => {
            mock.onGet('/api/chat-rooms/me').replyOnce(200, [
                {
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
                },
            ]);

            const rooms = await chatService.getMyChatRooms();

            expect(rooms).toHaveLength(1);
            expect(rooms[0]).toMatchObject({id: 1, counterpartName: '김민서', unreadCount: 2, status: 'ACTIVE'});
        });

        it('{data: T[]} 래핑 응답도 방어적으로 파싱하고, 비정상 응답은 빈 배열을 반환한다', async () => {
            mock.onGet('/api/chat-rooms/me').replyOnce(200, {data: [{id: 9}]});
            expect(await chatService.getMyChatRooms()).toEqual([{id: 9}]);

            mock.onGet('/api/chat-rooms/me').replyOnce(200, null);
            expect(await chatService.getMyChatRooms()).toEqual([]);
        });
    });

    describe('getMessages', () => {
        it('GET /api/chat-rooms/{roomId}/messages — page/size 쿼리를 전달하고 오래된순 배열을 그대로 반환한다', async () => {
            mock.onGet('/api/chat-rooms/3/messages').replyOnce(config => {
                expect(config.params).toEqual({page: 0, size: 50});
                return [
                    200,
                    [
                        {
                            id: 1,
                            chatRoomId: 3,
                            senderUserId: 5,
                            senderName: '김민서',
                            messageType: 'USER',
                            content: '안녕하세요',
                            masked: false,
                            mine: false,
                            sentAt: '2026-08-02T14:02:00',
                            readAt: null,
                        },
                    ],
                ];
            });

            const messages = await chatService.getMessages(3, 0, 50);

            expect(messages).toHaveLength(1);
            expect(messages[0]).toMatchObject({id: 1, content: '안녕하세요', mine: false});
        });
    });

    describe('sendMessage', () => {
        it('POST /api/chat-rooms/{roomId}/messages 에 content 를 전달한다', async () => {
            mock.onPost('/api/chat-rooms/3/messages').replyOnce(config => {
                expect(JSON.parse(config.data)).toEqual({content: '화~금 가능해요'});
                return [
                    201,
                    {
                        id: 2,
                        chatRoomId: 3,
                        senderUserId: 1,
                        senderName: '사장님',
                        messageType: 'USER',
                        content: '화~금 가능해요',
                        masked: false,
                        mine: true,
                        sentAt: '2026-08-02T14:03:00',
                        readAt: null,
                    },
                ];
            });

            const res = await chatService.sendMessage(3, '화~금 가능해요');
            expect(res).toMatchObject({id: 2, mine: true, content: '화~금 가능해요'});
        });

        it('읽기 전용 방(409 CHAT_ROOM_READ_ONLY)은 원본 에러를 그대로 reject 한다', async () => {
            mock.onPost('/api/chat-rooms/3/messages').replyOnce(409, {
                success: false,
                errorCode: 'CHAT_ROOM_READ_ONLY',
                message: '이 채팅방은 읽기 전용이에요.',
            });

            await expect(chatService.sendMessage(3, '늦었지만 답장')).rejects.toMatchObject({
                response: {status: 409, data: {errorCode: 'CHAT_ROOM_READ_ONLY'}},
            });
        });
    });

    describe('reportMessage', () => {
        it('POST /api/chat-messages/{messageId}/reports 에 reason 을 전달한다', async () => {
            mock.onPost('/api/chat-messages/10/reports').replyOnce(config => {
                expect(JSON.parse(config.data)).toEqual({reason: 'SPAM'});
                return [204];
            });

            await expect(chatService.reportMessage(10, 'SPAM')).resolves.toBeUndefined();
        });

        it('중복 신고(409 CHAT_REPORT_ALREADY_SUBMITTED)는 원본 에러를 그대로 reject 한다', async () => {
            mock.onPost('/api/chat-messages/10/reports').replyOnce(409, {
                success: false,
                errorCode: 'CHAT_REPORT_ALREADY_SUBMITTED',
                message: '이미 신고한 메시지예요.',
            });

            await expect(chatService.reportMessage(10, 'SPAM')).rejects.toMatchObject({
                response: {status: 409},
            });
        });
    });

    describe('blockUser', () => {
        it('POST /api/users/{userId}/block 를 호출한다', async () => {
            mock.onPost('/api/users/5/block').replyOnce(204);
            await expect(chatService.blockUser(5)).resolves.toBeUndefined();
        });
    });
});
