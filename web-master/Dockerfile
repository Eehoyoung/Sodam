# =============================================================================
# 소담 사장님 웹 콘솔(web-master) Dockerfile — 멀티스테이지 빌드
# - Stage 1 (deps): npm ci 의존성만 먼저 설치(레이어 캐시)
# - Stage 2 (builder): Next.js standalone 빌드
# - Stage 3 (runtime): Node 20 슬림 + 비루트 사용자
# =============================================================================

# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 타임에 API 베이스 URL 주입 (NEXT_PUBLIC_* 은 클라이언트 번들에 포함됨 — 시크릿 아님)
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:7070
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== Stage 3: Runtime =====
FROM node:20-alpine AS runtime

LABEL org.opencontainers.image.title="sodam-web-master"
LABEL org.opencontainers.image.description="소담(SODAM) — 사장님 웹 콘솔 (Next.js)"

RUN addgroup --system --gid 1001 sodam && \
    adduser --system --uid 1001 --ingroup sodam sodam

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Docker는 컨테이너 시작 시 HOSTNAME env를 컨테이너 ID로 자동 설정하는데, Next.js standalone
    # 서버는 이 값을 그대로 바인드 주소로 사용해버려(0.0.0.0이 아니라 컨테이너 실IP에만 바인드)
    # 컨테이너 내부 루프백(localhost/127.0.0.1) 접근이 막힌다 — HEALTHCHECK가 실패하는 원인이었다.
    # 호스트→컨테이너 포트 매핑은 실IP 바인딩이라 영향 없었지만(브라우저 접속은 정상), 명시적으로
    # 0.0.0.0으로 override해 컨테이너 내부 루프백도 정상 동작하게 한다.
    HOSTNAME="0.0.0.0"

# standalone 산출물만 복사 (node_modules 포함된 최소 런타임)
COPY --from=builder --chown=sodam:sodam /app/.next/standalone ./
COPY --from=builder --chown=sodam:sodam /app/.next/static ./.next/static
COPY --from=builder --chown=sodam:sodam /app/public ./public

USER sodam

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
