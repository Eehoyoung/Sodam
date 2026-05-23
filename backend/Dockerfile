# =============================================================================
# 소담 BE Dockerfile — 멀티스테이지 빌드
# - Stage 1 (builder): Gradle 8.13 + Eclipse Temurin 17 로 jar 빌드
# - Stage 2 (runtime): JRE 17 슬림 + 비루트 사용자 + 헬스체크
# =============================================================================

# ===== Stage 1: Builder =====
FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /workspace

# Gradle 캐시 효율화 — 의존성 먼저 다운로드
COPY gradlew settings.gradle build.gradle ./
COPY gradle/ gradle/
RUN chmod +x gradlew && \
    ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

# 소스 복사 + 빌드 (테스트는 CI 에서 별도 수행 — 컨테이너 빌드 속도 우선)
COPY src/ src/
RUN ./gradlew --no-daemon clean bootJar -x test


# ===== Stage 2: Runtime =====
FROM eclipse-temurin:17-jre-jammy AS runtime

LABEL org.opencontainers.image.title="sodam-backend"
LABEL org.opencontainers.image.description="소담(SODAM) — 소상공인 근태·급여·세무 SaaS 백엔드"
LABEL org.opencontainers.image.source="https://github.com/Eehoyoung/sodam"

# 비루트 사용자 (보안)
RUN groupadd --system --gid 1001 sodam && \
    useradd --system --uid 1001 --gid sodam --home-dir /app sodam

# 운영 OS 패치 (취약점 줄이기) + curl (헬스체크)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl tini && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# JAR 복사
COPY --from=builder --chown=sodam:sodam /workspace/build/libs/*.jar /app/sodam.jar

# 업로드 디렉터리 (ObjectStorage 로컬 mock 모드)
RUN mkdir -p /app/uploads /app/logs && \
    chown -R sodam:sodam /app

USER sodam

# 환경변수 기본값 (compose 에서 override)
ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080 \
    JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom" \
    TZ=Asia/Seoul

EXPOSE 8080

# 헬스체크 — actuator/health 정상 응답 시 healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:${SERVER_PORT}/actuator/info || exit 1

# tini 로 PID 1 시그널 처리 (graceful shutdown)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "exec java $JAVA_OPTS -jar /app/sodam.jar"]
