package com.rich.sodam.exception;

import com.rich.sodam.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.LocaleResolver;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 애플리케이션 전역 예외 처리기
 */
@Slf4j
@Hidden
@RestControllerAdvice
public class GlobalExceptionHandler {

    private final MessageSource messageSource;
    private final LocaleResolver localeResolver;
    private final com.rich.sodam.config.SentryReporter sentryReporter;

    public GlobalExceptionHandler(MessageSource messageSource, LocaleResolver localeResolver,
                                  com.rich.sodam.config.SentryReporter sentryReporter) {
        this.messageSource = messageSource;
        this.localeResolver = localeResolver;
        this.sentryReporter = sentryReporter;
    }

    /**
     * 위치 검증 실패 예외 처리 (403)
     */
    @ExceptionHandler(LocationVerificationException.class)
    public ResponseEntity<ApiResponse<Object>> handleLocationVerificationException(LocationVerificationException e) {
        log.warn("LocationVerificationException: {}", e.getMessage(), e);
        ApiResponse<Object> response = ApiResponse.error(e.getErrorCode(), e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * NFC 태그 검증 실패 예외 처리 (403) — 대리출근 방지. 미등록/비활성 태그로는 출퇴근을 기록하지 않는다.
     */
    @ExceptionHandler(NfcVerificationException.class)
    public ResponseEntity<ApiResponse<Object>> handleNfcVerificationException(NfcVerificationException e) {
        log.warn("NfcVerificationException: {}", e.getMessage(), e);
        ApiResponse<Object> response = ApiResponse.error(e.getErrorCode(), e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * 권한 거부 — @PreAuthorize/Method Security/StoreAccessGuard 거부.
     */
    @ExceptionHandler({
            org.springframework.security.access.AccessDeniedException.class,
            org.springframework.security.authorization.AuthorizationDeniedException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(Exception e) {
        log.warn("권한 거부: {}", e.getMessage());
        // RBAC 우회 시도 알람 — Sentry 캡처(비활성 시 no-op). 메시지엔 PII 미포함.
        sentryReporter.captureException(
                com.rich.sodam.config.SentryReporter.ALERT_RBAC_BYPASS, e,
                java.util.Map.of("exception", e.getClass().getSimpleName()));
        ApiResponse<Object> response = ApiResponse.error("FORBIDDEN",
                e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : "해당 작업에 대한 권한이 없어요.");
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * 플랜 게이팅 거부 — 현재 구독 플랜으로 접근 불가한 기능 (402). FE 가 페이월/업그레이드 유도.
     */
    @ExceptionHandler(PlanRequiredException.class)
    public ResponseEntity<ApiResponse<Object>> handlePlanRequired(PlanRequiredException e) {
        log.info("플랜 게이팅: required={} current={} - {}",
                e.getRequiredPlan(), e.getCurrentPlan(), e.getMessage());
        Map<String, String> detail = new HashMap<>();
        detail.put("requiredPlan", e.getRequiredPlan().name());
        detail.put("currentPlan", e.getCurrentPlan().name());
        ApiResponse<Object> response = ApiResponse.error("PLAN_REQUIRED", e.getMessage(), detail);
        return new ResponseEntity<>(response, HttpStatus.PAYMENT_REQUIRED);
    }

    /**
     * 출근권 잔액 부족(402) — 채용 제안 발송/지원서 열람+채팅 개설에 필요한 출근권이 부족할 때.
     * FE 가 충전(페이월) 유도로 분기한다(api-design.md: 결제 필요 402 + errorCode).
     */
    @ExceptionHandler(InsufficientCreditException.class)
    public ResponseEntity<ApiResponse<Object>> handleInsufficientCredit(InsufficientCreditException e) {
        log.info("출근권 부족: required={} balance={} - {}", e.getRequired(), e.getBalance(), e.getMessage());
        Map<String, Integer> detail = new HashMap<>();
        detail.put("required", e.getRequired());
        detail.put("balance", e.getBalance());
        ApiResponse<Object> response = ApiResponse.error("ATTENDANCE_CREDIT_INSUFFICIENT", e.getMessage(), detail);
        return new ResponseEntity<>(response, HttpStatus.PAYMENT_REQUIRED);
    }

    @ExceptionHandler(ManagerAccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleManagerAccessDenied(ManagerAccessDeniedException e) {
        return ResponseEntity.status(e.getStatus())
                .body(ApiResponse.error(e.getCode(), e.getMessage()));
    }

    /**
     * 채팅 발신 자동 제한(403) — 신고 누적 임계치 도달로 운영 검토 대기 중인 계정의 발신 시도.
     * RBAC 우회 알람이 함께 도는 {@link org.springframework.security.access.AccessDeniedException} 과
     * 의미가 다르므로 별도 핸들러를 둔다(ChatSenderRestrictedException 클래스 주석 참고).
     */
    @ExceptionHandler(ChatSenderRestrictedException.class)
    public ResponseEntity<ApiResponse<Object>> handleChatSenderRestricted(ChatSenderRestrictedException e) {
        log.info("채팅 발신 제한: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(e.getErrorCode(), e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * 웹 콘솔 계정 임시 잠금(423) — 04_보안정책.md §4/§10. IP rate limit(429)과는 별개 방어선이므로
     * 상태코드도 구분한다(AccountLockedException 클래스 주석 참고).
     */
    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccountLocked(AccountLockedException e) {
        log.warn("계정 잠금: retryAfterSeconds={}", e.getRetryAfterSeconds());
        Map<String, String> detail = new HashMap<>();
        detail.put("retryAfterSeconds", String.valueOf(e.getRetryAfterSeconds()));
        ApiResponse<Object> response = ApiResponse.error(AccountLockedException.ERROR_CODE, e.getMessage(), detail);
        return new ResponseEntity<>(response, HttpStatus.LOCKED);
    }

    @ExceptionHandler(com.rich.sodam.service.ElectronicSignatureRefreshLimiter.TooManySignatureRefreshesException.class)
    public ResponseEntity<ApiResponse<Object>> handleSignatureRefreshRateLimit(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(ApiResponse.error("ESIGN-RATE-001", e.getMessage()));
    }

    /** 웹 콘솔 로그인 — 계정 기준 rate limit 초과(429). IP 기준은 RateLimitFilter 가 필터 단에서 처리. */
    @ExceptionHandler(WebLoginRateLimitExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleWebLoginRateLimit(WebLoginRateLimitExceededException e) {
        log.warn("웹 로그인 계정 rate limit 초과");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(ApiResponse.error("WEB_LOGIN_RATE_LIMITED", e.getMessage()));
    }

    @ExceptionHandler(LoginAccountRateLimitExceededException.class)
    public ResponseEntity<ApiResponse<Object>> handleLoginAccountRateLimit(LoginAccountRateLimitExceededException e) {
        log.warn("로그인 계정 rate limit 초과");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(ApiResponse.error("LOGIN_RATE_LIMITED", e.getMessage()));
    }

    /**
     * 인증 실패 — JWT 없음/만료/잘못된 토큰.
     */
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> handleAuthenticationException(
            org.springframework.security.core.AuthenticationException e) {
        log.warn("인증 실패: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error("UNAUTHORIZED", "로그인이 필요해요.");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    /**
     * 현재 요청의 로케일을 가져옵니다.
     *
     * @return 현재 로케일
     */
    private Locale getCurrentLocale() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            return localeResolver.resolveLocale(request);
        }
        return Locale.KOREAN; // 기본값
    }

    /**
     * 비즈니스 예외 처리
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Object>> handleBusinessException(BusinessException e) {
        log.error("BusinessException: {}", e.getMessage(), e);

        ApiResponse<Object> response = ApiResponse.error(e.getErrorCode(), e.getMessage());

        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (e instanceof EntityNotFoundException) {
            status = HttpStatus.NOT_FOUND;
        }

        return new ResponseEntity<>(response, status);
    }

    /**
     * 유효성 검증 예외 처리
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException e) {
        Locale locale = getCurrentLocale();
        BindingResult bindingResult = e.getBindingResult();
        // MethodArgumentNotValidException diagnostics include rejected field values (password/OTP/PII included).
        // Keep validation observability without writing client input or its stack trace to logs.
        log.warn("ValidationException fieldCount={} fields={}", bindingResult.getErrorCount(),
                bindingResult.getFieldErrors().stream().map(FieldError::getField).distinct().toList());
        Map<String, String> fieldErrors = new HashMap<>();

        for (FieldError fieldError : bindingResult.getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        String errorMessage = messageSource.getMessage("error.validation.failed", null, locale);
        ApiResponse<Map<String, String>> response = ApiResponse.error(ErrorCode.VALIDATION_ERROR.getCode(), errorMessage, fieldErrors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }


    /**
     * 상태 충돌(409) — BusinessException(400) 보다 구체적인 핸들러가 우선 적용된다.
     */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Object>> handleConflictException(ConflictException e) {
        log.warn("ConflictException: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(e.getErrorCode(), e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * 낙관적 락 충돌(409) — 웹 콘솔·모바일 앱이 같은 리소스(출퇴근·스케줄 등)를 동시에 수정할 때
     * JPA/Hibernate 가 버전 불일치를 감지해 던지는 예외. Spring Data JPA 는 보통
     * {@link org.springframework.orm.ObjectOptimisticLockingFailureException}(부모는
     * {@link org.springframework.dao.OptimisticLockingFailureException})을 던진다 — 부모 타입으로
     * 잡아 두 경우 모두 처리한다(05_동시성제어_및_고급아키텍처.md §2, 06_DB_마이그레이션계획.md §2.1).
     */
    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Object>> handleOptimisticLockingFailure(
            org.springframework.dao.OptimisticLockingFailureException e) {
        log.warn("OptimisticLockingFailure: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(
                "OPTIMISTIC_LOCK_CONFLICT", "다른 곳에서 먼저 수정되었어요. 새로고침 후 다시 시도해 주세요.");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * 순수 JPA 표준 낙관적 락 예외 — Spring Data JPA 리포지토리를 거치지 않고 직접
     * {@code EntityManager}/{@code jakarta.persistence}를 사용하는 경로에서 던져질 수 있어 함께 처리한다.
     */
    @ExceptionHandler(jakarta.persistence.OptimisticLockException.class)
    public ResponseEntity<ApiResponse<Object>> handleJpaOptimisticLockException(
            jakarta.persistence.OptimisticLockException e) {
        log.warn("OptimisticLockException: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(
                "OPTIMISTIC_LOCK_CONFLICT", "다른 곳에서 먼저 수정되었어요. 새로고침 후 다시 시도해 주세요.");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * IllegalArgumentException 처리
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.error("IllegalArgumentException: {}", e.getMessage(), e);

        ApiResponse<Object> response = ApiResponse.error(ErrorCode.INVALID_ARGUMENT.getCode(), e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * NoSuchElementException 처리
     */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiResponse<Object>> handleNoSuchElementException(NoSuchElementException e) {
        log.error("NoSuchElementException: {}", e.getMessage(), e);

        Locale locale = getCurrentLocale();
        String message = e.getMessage() != null ? e.getMessage() : messageSource.getMessage("error.resource.not.found", null, locale);
        ApiResponse<Object> response = ApiResponse.error(ErrorCode.RESOURCE_NOT_FOUND.getCode(), message);
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    /**
     * 404 No Resource — Spring 6+ 정적 자원 미발견 (잘못된 URL)
     */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException e) {
        // 디버그 레벨로 로그 — 일반 클라이언트의 잘못된 URL 호출일 뿐 (스팸 방지)
        log.debug("NoResourceFoundException: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(
                ErrorCode.RESOURCE_NOT_FOUND.getCode(),
                "요청하신 경로를 찾을 수 없어요.");
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    /**
     * JSON 파싱 실패 / 잘못된 요청 본문 (400)
     */
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException e) {
        log.warn("HttpMessageNotReadable: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(
                ErrorCode.INVALID_ARGUMENT.getCode(),
                "요청 본문을 읽을 수 없어요. JSON 형식을 확인해 주세요.");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * 필수 쿼리 파라미터 누락 — 500 이 아닌 400 으로 응답(클라이언트 입력 오류임을 명확히).
     */
    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Object>> handleMissingParam(
            org.springframework.web.bind.MissingServletRequestParameterException e) {
        log.warn("MissingServletRequestParameter: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(
                ErrorCode.INVALID_ARGUMENT.getCode(),
                "필수 파라미터가 누락됐어요: " + e.getParameterName());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Bean Validation 위반 (PathVariable/RequestParam @Valid 검증 실패)
     */
    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleConstraintViolation(
            jakarta.validation.ConstraintViolationException e) {
        log.warn("ConstraintViolation: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(
                ErrorCode.VALIDATION_ERROR.getCode(),
                "입력값이 올바르지 않아요: " + e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * DB 무결성 위반 (unique 제약 등) — 매장 사업자등록번호 중복 등을 친절한 409 로 안내.
     * 미처리 시 generic 500 으로 떨어져 사용자가 원인을 알 수 없다(매장생성 시 실제 발생).
     */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException e) {
        String detail = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
        // SQL diagnostics can embed duplicate emails, phone numbers, or other submitted values.
        // Use the diagnostic only for the response classification below, never for logging.
        log.warn("DataIntegrityViolation causeType={}",
                e.getMostSpecificCause() == null ? e.getClass().getSimpleName()
                        : e.getMostSpecificCause().getClass().getSimpleName());
        String message;
        if (detail != null && detail.toLowerCase().contains("business_number")) {
            message = "이미 등록된 사업자등록번호예요. 번호를 다시 확인해 주세요.";
        } else if (detail != null && detail.toLowerCase().contains("duplicate")) {
            message = "이미 등록된 정보예요. 중복되지 않는 값으로 다시 시도해 주세요.";
        } else {
            message = "요청을 처리할 수 없어요. 입력값을 다시 확인해 주세요.";
        }
        ApiResponse<Object> response = ApiResponse.error(ErrorCode.INVALID_ARGUMENT.getCode(), message);
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * 인증/권한 — Spring Security 예외는 별도 처리하므로 여기선 IllegalState
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalState(IllegalStateException e) {
        log.warn("IllegalStateException: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error(
                "ILLEGAL_STATE", e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * NullPointerException — 명시 핸들러 (디버그 메시지 노출)
     */
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ApiResponse<Object>> handleNpe(NullPointerException e) {
        log.error("NullPointerException at {}", topFrameOf(e), e);
        // 운영에서는 메시지 가림. dev 에서는 디버깅 위해 노출.
        boolean dev = isDevProfile();
        String msg = dev
                ? "NPE: " + (e.getMessage() == null ? "null" : e.getMessage()) + " @ " + topFrameOf(e)
                : "예기치 못한 오류가 발생했어요.";
        ApiResponse<Object> response = ApiResponse.error(
                ErrorCode.INTERNAL_SERVER_ERROR.getCode(), msg);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * 기타 예외 처리 (폴백) — dev 프로필에서는 root cause 노출, 운영에서는 마스킹
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleException(Exception e) {
        log.error("Unhandled exception [{}] at {}",
                e.getClass().getSimpleName(), topFrameOf(e), e);

        boolean dev = isDevProfile();
        String errorMessage;
        if (dev) {
            errorMessage = e.getClass().getSimpleName() + ": "
                    + (e.getMessage() == null ? "(no message)" : e.getMessage())
                    + " @ " + topFrameOf(e);
        } else {
            Locale locale = getCurrentLocale();
            errorMessage = messageSource.getMessage("error.internal.server", null, locale);
        }
        ApiResponse<Object> response = ApiResponse.error(
                ErrorCode.INTERNAL_SERVER_ERROR.getCode(), errorMessage);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /** 활성 프로필이 dev 인지 확인 (env 변수 기반 — Spring 의존성 줄임). */
    private boolean isDevProfile() {
        String active = System.getProperty("spring.profiles.active",
                System.getenv().getOrDefault("SPRING_PROFILES_ACTIVE", ""));
        return active != null && active.contains("dev");
    }

    /** 스택트레이스 최상단 프레임 — 디버그용 (운영 컨텍스트 노출 X). */
    private String topFrameOf(Throwable t) {
        StackTraceElement[] st = t.getStackTrace();
        if (st == null || st.length == 0) return "(no stack)";
        for (StackTraceElement e : st) {
            if (e.getClassName().startsWith("com.rich.sodam")) {
                return e.getClassName() + "." + e.getMethodName() + ":" + e.getLineNumber();
            }
        }
        return st[0].getClassName() + "." + st[0].getMethodName() + ":" + st[0].getLineNumber();
    }
}
