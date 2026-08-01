const mockActivate = jest.fn();
const mockDeactivate = jest.fn().mockResolvedValue(undefined);

jest.mock('@stomp/stompjs', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connected: false,
    activate: mockActivate,
    deactivate: mockDeactivate,
    subscribe: jest.fn(),
  })),
}));

import {disconnectLiveSync, subscribeStore} from '../../../src/common/realtime/storeSyncClient';

describe('storeSyncClient lifecycle', () => {
  afterEach(() => {
    disconnectLiveSync();
    jest.clearAllMocks();
  });

  test('deactivates the STOMP client when its final listener unsubscribes', () => {
    const unsubscribe = subscribeStore(1, jest.fn());

    unsubscribe();

    expect(mockActivate).toHaveBeenCalledTimes(1);
    expect(mockDeactivate).toHaveBeenCalledTimes(1);
  });
});
