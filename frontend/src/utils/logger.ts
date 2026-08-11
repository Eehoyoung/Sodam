/**
 * 앱 공용 로거 — 화면·서비스 코드가 `console` 을 직접 부르지 않게 하는 단일 진입점.
 *
 * <p><b>왜 console 을 직접 쓰지 않는가</b>
 * <ul>
 *   <li><b>자격증명이 새지 않는다</b>: 추가 인자(에러 객체 등)를 console 로 그대로 넘기지 않고
 *       <b>안전한 요약만</b> 뽑아 메시지 한 줄로 합친다. axios 오류를 그대로 찍으면
 *       {@code config.headers.Authorization}·{@code config.data.password}·재설정 티켓이
 *       통째로 로그에 남는다(`.claude/rules/security.md` — 로그에 PII 원문 금지).
 *       이 계약은 `__tests__/utils/loggerSecurity.test.ts` 가 지킨다</li>
 *   <li><b>운영에서 조용해진다</b>: 운영 기본 레벨이 WARN 이라 debug/info 는 아예 나가지 않는다</li>
 *   <li><b>한 곳만 고치면 된다</b>: 마스킹 규칙을 바꿀 때 호출부 수백 곳이 아니라 이 파일만 손댄다</li>
 * </ul>
 *
 * <p><b>console 과 호출 방식이 같다</b> — `logger.warn('[Tag] 실패', error)` 처럼 인자를 이어서
 * 넘기면 된다. 다만 <b>출력은 항상 문자열 한 개</b>이고, 추가 인자는 아래 규칙으로 축약된다:
 * Error 는 `이름: 메시지`, HTTP 오류는 상태코드, 문자열은 PII 마스킹 후, 그 외는 타입 이름만.
 * <b>객체 내부를 그대로 펼치지 않는다</b> — 무엇이 들어올지 모르기 때문이다.</p>
 */

/**
 * 식별정보 마스킹 — `common/monitoring/sentry.ts` 와 같은 규칙을 쓴다.
 * 두 곳이 어긋나면 한쪽으로만 새므로, 패턴을 바꿀 때는 반드시 함께 고칠 것.
 */
const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]'],
  [/(?:\+?82[-\s]?)?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g, '[PHONE]'],
  [/\d{6}[-\s]?[1-4]\d{6}/g, '[RRN]'],
  [/\d{3}-\d{2}-\d{5}/g, '[BRN]'],
  [/3[0-9]\.\d{4,}\s*,\s*12[0-9]\.\d{4,}/g, '[GEO]'],
];

function maskPii(text: string): string {
  return PII_PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

/**
 * 추가 인자를 <b>안전한 한 줄</b>로 축약한다.
 *
 * <p>⚠️ <b>객체를 그대로 펼치지 않는 것이 이 함수의 핵심이다.</b> axios 오류 하나에도
 * `config.headers.Authorization`(액세스 토큰)·`config.data.password`·`response.data.resetTicket`
 * 이 들어 있다. "민감한 키만 지우는" 블랙리스트 방식은 새 필드가 생기면 조용히 새므로,
 * <b>내보낼 것만 고르는 화이트리스트</b>로 간다.</p>
 */
function summarize(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (value instanceof Error) {
    return `${value.name}: ${maskPii(value.message)}`;
  }
  if (typeof value === 'string') {
    return maskPii(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    // axios 계열 오류에서 진단에 실제로 쓰이는 건 상태코드다. 본문은 내보내지 않는다.
    const status = (value as {response?: {status?: unknown}}).response?.status;
    if (typeof status === 'number') {
      return `HTTP ${status}`;
    }
    const message = (value as {message?: unknown}).message;
    if (typeof message === 'string') {
      return maskPii(message);
    }
    return Array.isArray(value) ? `Array(${value.length})` : 'Object';
  }
  return typeof value;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
}

class Logger {
  private currentLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;

  private formatMessage(level: LogLevel, message: unknown, data: unknown[], context?: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    const detail = data.length > 0 ? ` | ${data.map(summarize).join(' | ')}` : '';
    return `${timestamp} ${levelName} ${contextStr} ${maskPii(String(message))}${detail}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  /**
   * 실제 출력.
   *
   * <p><b>console 에 넘기는 인자는 언제나 문자열 하나다.</b> 원본 객체를 두 번째 인자로 넘기면
   * console(그리고 그것을 가로채는 크래시 리포터)이 객체를 통째로 직렬화해 자격증명이 새어나간다.
   * 추가 인자는 {@link summarize} 로 축약해 이 문자열 안에 이미 합쳐져 있다.</p>
   */
  private logToConsole(level: LogLevel, message: unknown, data: unknown[], context?: string): void {
    const formattedMessage = this.formatMessage(level, message, data, context);

    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console -- 이 파일이 console 을 감싸는 단일 지점이다
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.log(formattedMessage);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(formattedMessage);
        break;
    }
  }

  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  debug(message: unknown, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.logToConsole(LogLevel.DEBUG, message, data);
    }
  }

  info(message: unknown, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.logToConsole(LogLevel.INFO, message, data);
    }
  }

  warn(message: unknown, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.logToConsole(LogLevel.WARN, message, data);
    }
  }

  error(message: unknown, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.logToConsole(LogLevel.ERROR, message, data);
    }
  }

  /** 태그가 붙는 진단 로그. 태그는 `[CTX]` 로 앞에 붙는다. */
  private tagged(level: LogLevel, context: string, message: unknown, data: unknown[]): void {
    if (this.shouldLog(level)) {
      this.logToConsole(level, message, data, context);
    }
  }

  // 복구·진단 전용 로깅
  recovery(message: unknown, ...data: unknown[]): void {
    this.tagged(LogLevel.INFO, 'RECOVERY', message, data);
  }

  wsodFix(message: unknown, ...data: unknown[]): void {
    this.tagged(LogLevel.INFO, 'WSOD_FIX', message, data);
  }

  timingCoordination(message: unknown, ...data: unknown[]): void {
    this.tagged(LogLevel.WARN, 'TIMING_COORDINATION', message, data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common usage patterns
export const logRecovery = (message: unknown, ...data: unknown[]): void =>
  logger.recovery(message, ...data);

export const logWsodFix = (message: unknown, ...data: unknown[]): void =>
  logger.wsodFix(message, ...data);

export const logTimingCoordination = (message: unknown, ...data: unknown[]): void =>
  logger.timingCoordination(message, ...data);
