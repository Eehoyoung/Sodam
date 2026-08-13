import {logger, LogLevel} from '../../src/utils/logger';

/**
 * logger 의 보안 경계 — <b>추가 인자를 console 로 그대로 넘기지 않는다.</b>
 *
 * axios 오류 하나에 액세스 토큰(`config.headers.Authorization`)·비밀번호(`config.data.password`)·
 * 재설정 티켓(`response.data.resetTicket`)이 전부 들어 있다. 이걸 console 에 넘기면 크래시
 * 리포터·로그 수집기가 통째로 직렬화한다(`.claude/rules/security.md` — 로그에 PII 원문 금지).
 *
 * ⚠️ 호출 규약이 2026-08-11 에 바뀌었다. 이전에는 `logger.error(msg, 'CTX', data)` 였고 3번째
 * 인자를 <b>통째로 버려서</b> 안전했지만 디버깅이 불가능했다(빈 메시지만 남았다). 지금은 console
 * 과 같은 가변인자를 받되 <b>안전한 요약만</b> 뽑아 문자열 한 개로 합친다. 태그는 메시지에
 * `[CTX] ` 로 직접 적는다. 아래 "인자 1개" 단언이 그 경계를 지킨다.
 */
describe('logger security boundary', () => {
  beforeEach(() => {
    logger.setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const rawAxiosError = {
    config: {
      headers: {Authorization: 'Bearer secret-access-token'},
      data: {email: 'person@example.com', password: 'secret-password'},
    },
    response: {status: 401, data: {resetTicket: 'reset-ticket'}},
  };

  test('does not pass raw request credentials to console.error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('[AUTH_SERVICE] login failed', rawAxiosError);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    // 인자가 하나여야 한다 — 원본 객체를 2번째 인자로 넘기는 순간 통째로 직렬화된다.
    expect(errorSpy.mock.calls[0]).toHaveLength(1);
    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).toContain('[AUTH_SERVICE] login failed');
    expect(line).not.toContain('secret-access-token');
    expect(line).not.toContain('secret-password');
    expect(line).not.toContain('reset-ticket');
    expect(line).not.toContain('person@example.com');
  });

  test('HTTP 오류는 상태코드만 남긴다 — 본문은 내보내지 않는다', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('[AUTH_SERVICE] login failed', rawAxiosError);

    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).toContain('HTTP 401');
  });

  test('Error 는 이름과 메시지가 남아 디버깅이 가능하다', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('[STORE] 목록 조회 실패', new TypeError('storeId is not a number'));

    const line = warnSpy.mock.calls[0][0] as string;
    expect(line).toContain('TypeError: storeId is not a number');
  });

  test('메시지·문자열 인자의 식별정보는 마스킹된다', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('가입 실패 person@example.com', '010-1234-5678');

    const line = warnSpy.mock.calls[0][0] as string;
    expect(line).toContain('[EMAIL]');
    expect(line).toContain('[PHONE]');
    expect(line).not.toContain('person@example.com');
    expect(line).not.toContain('010-1234-5678');
  });

  test('알 수 없는 객체는 내부를 펼치지 않는다', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('[X] 실패', {secretField: 'do-not-leak', nested: {token: 'nope'}});

    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).toContain('Object');
    expect(line).not.toContain('do-not-leak');
    expect(line).not.toContain('nope');
  });

  test('운영 레벨(WARN)에서는 debug/info 가 아예 나가지 않는다', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    logger.setLogLevel(LogLevel.WARN);

    logger.debug('추적 로그');
    logger.info('정보 로그');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
