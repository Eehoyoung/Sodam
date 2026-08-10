import * as Sentry from '@sentry/react-native';
import {env} from '../config/env';

const REDACTED = '[REDACTED]';
let initialized = false;

/**
 * 예외 메시지에 섞여 나가기 쉬운 식별정보 패턴. 오류 원인을 읽을 수 있을 만큼은 남기고
 * 값만 지운다 — 메시지 전체를 지우면 Sentry 를 켜는 의미가 없어진다.
 *
 * 순서 주의: 이메일을 먼저 지워야 도메인 뒤 숫자가 전화번호로 잡히지 않는다.
 */
const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]'],
  // 010-1234-5678 / 01012345678 / +82 10-1234-5678
  [/(?:\+?82[-\s]?)?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g, '[PHONE]'],
  // 주민등록번호 형태(저장하지 않지만 입력 검증 오류로 새어나갈 수 있다)
  [/\d{6}[-\s]?[1-4]\d{6}/g, '[RRN]'],
  // 사업자등록번호 000-00-00000
  [/\d{3}-\d{2}-\d{5}/g, '[BRN]'],
  // 좌표(위경도) — 보안 규칙상 GPS 는 로그에 남기지 않는다
  [/3[0-9]\.\d{4,}\s*,\s*12[0-9]\.\d{4,}/g, '[GEO]'],
];

/** 문자열에서 식별정보만 치환한다. */
function maskPii(text: string): string {
  return PII_PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    return REDACTED;
  }
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).map(key => [key, REDACTED]));
  }
  return value;
}

/** Human approval is still required to set SODAM_SENTRY_DSN in a production build. */
export function initializeSentry(): void {
  if (initialized || !env.sentryDsn) {
    return;
  }
  initialized = true;
  Sentry.init({
    dsn: env.sentryDsn,
    enabled: env.name === 'prod',
    environment: env.name,
    sendDefaultPii: false,
    beforeSend: event => ({
      ...event,
      user: undefined,
      request: undefined,
      contexts: undefined,
      // 예외 메시지·스택은 PII 위험이 가장 큰 곳인데 기존에는 그대로 나갔다.
      // 개인정보처리방침 제9조 국외이전 항목이 이 마스킹을 전제로 기재돼 있다.
      message: event.message ? maskPii(event.message) : undefined,
      exception: event.exception?.values
        ? {
            ...event.exception,
            values: event.exception.values.map(value => ({
              ...value,
              value: value.value ? maskPii(value.value) : undefined,
            })),
          }
        : event.exception,
      extra: event.extra ? scrub(event.extra) as Record<string, unknown> : undefined,
      breadcrumbs: event.breadcrumbs?.map(breadcrumb => ({
        ...breadcrumb,
        message: breadcrumb.message ? REDACTED : undefined,
        data: breadcrumb.data ? scrub(breadcrumb.data) as Record<string, unknown> : undefined,
      })),
    }),
    beforeBreadcrumb: breadcrumb => ({
      ...breadcrumb,
      message: breadcrumb.message ? REDACTED : undefined,
      data: breadcrumb.data ? scrub(breadcrumb.data) as Record<string, unknown> : undefined,
    }),
  });
}
