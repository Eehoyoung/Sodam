import {Platform} from 'react-native';
import notificationApi from '../../../src/common/services/NotificationService';
import api from '../../../src/common/api/client';

jest.mock('../../../src/common/api/client', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
}));

// [Test Mapping] FCM 토큰 등록/해제
// - POST   /api/notifications/token         {token, platform}
// - DELETE /api/notifications/token?token=...

describe('notificationApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('platform 인자가 주어지면 그대로 사용한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: undefined});
            await notificationApi.register('tk_1', 'ANDROID');
            expect(api.post).toHaveBeenCalledWith('/api/notifications/token', {
                token: 'tk_1',
                platform: 'ANDROID',
            });
        });

        it('platform 누락 시 Platform.OS=ios 면 IOS 로 매핑', async () => {
            (Platform as any).OS = 'ios';
            (api.post as jest.Mock).mockResolvedValue({data: undefined});
            await notificationApi.register('tk_ios');
            expect(api.post).toHaveBeenCalledWith('/api/notifications/token', {
                token: 'tk_ios',
                platform: 'IOS',
            });
        });

        it('platform 누락 시 Platform.OS=android 면 ANDROID 로 매핑', async () => {
            (Platform as any).OS = 'android';
            (api.post as jest.Mock).mockResolvedValue({data: undefined});
            await notificationApi.register('tk_aos');
            expect(api.post).toHaveBeenCalledWith('/api/notifications/token', {
                token: 'tk_aos',
                platform: 'ANDROID',
            });
        });

        it('platform 누락 + 기타 OS 면 WEB 으로 매핑', async () => {
            (Platform as any).OS = 'web';
            (api.post as jest.Mock).mockResolvedValue({data: undefined});
            await notificationApi.register('tk_web');
            expect(api.post).toHaveBeenCalledWith('/api/notifications/token', {
                token: 'tk_web',
                platform: 'WEB',
            });
        });
    });

    describe('unregister', () => {
        it('DELETE 호출 + 토큰을 쿼리스트링에 인코딩한다', async () => {
            (api.delete as jest.Mock).mockResolvedValue({data: undefined});
            await notificationApi.unregister('plain-token');
            expect(api.delete).toHaveBeenCalledWith(
                '/api/notifications/token?token=plain-token'
            );
        });

        it('특수문자 토큰은 URL 인코딩된다', async () => {
            (api.delete as jest.Mock).mockResolvedValue({data: undefined});
            await notificationApi.unregister('a/b+c=&d');
            expect(api.delete).toHaveBeenCalledWith(
                `/api/notifications/token?token=${encodeURIComponent('a/b+c=&d')}`
            );
        });
    });
});
