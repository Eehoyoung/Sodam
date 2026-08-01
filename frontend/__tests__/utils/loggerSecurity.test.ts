import {logger, LogLevel} from '../../src/utils/logger';

describe('logger security boundary', () => {
  beforeEach(() => {
    logger.setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not pass raw request credentials to console.error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const rawAxiosError = {
      config: {
        headers: {Authorization: 'Bearer secret-access-token'},
        data: {email: 'person@example.com', password: 'secret-password'},
      },
      response: {data: {resetTicket: 'reset-ticket'}},
    };

    logger.error('login failed', 'AUTH_SERVICE', rawAxiosError);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]).toHaveLength(1);
    expect(errorSpy.mock.calls[0][0]).toContain('[AUTH_SERVICE] login failed');
    expect(errorSpy.mock.calls[0][0]).not.toContain('secret-access-token');
    expect(errorSpy.mock.calls[0][0]).not.toContain('secret-password');
  });
});
