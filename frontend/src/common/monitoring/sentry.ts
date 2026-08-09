import * as Sentry from '@sentry/react-native';
import {env} from '../config/env';

const REDACTED = '[REDACTED]';
let initialized = false;

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
