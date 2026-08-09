import notificationService, {NotificationPreferences} from '../../src/features/notification/services/notificationService';
import api from '../../src/common/api/client';

jest.mock('../../src/common/api/client', () => ({
    __esModule: true,
    default: {get: jest.fn(), put: jest.fn()},
}));

const preferences: NotificationPreferences = {
    master: true,
    attendance: true,
    payroll: true,
    billing: false,
    marketing: false,
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
};

describe('notification preference API mapping', () => {
    beforeEach(() => jest.clearAllMocks());

    it('reads and writes the authenticated user preference resource', async () => {
        (api.get as jest.Mock).mockResolvedValueOnce({data: preferences});
        (api.put as jest.Mock).mockResolvedValueOnce({data: preferences});

        await expect(notificationService.getPreferences()).resolves.toEqual(preferences);
        await expect(notificationService.updatePreferences(preferences)).resolves.toEqual(preferences);

        expect(api.get).toHaveBeenCalledWith('/api/notifications/prefs');
        expect(api.put).toHaveBeenCalledWith('/api/notifications/prefs', preferences);
    });
});
