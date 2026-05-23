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

    public GlobalExceptionHandler(MessageSource messageSource, LocaleResolver localeResolver) {
        this.messageSource = messageSource;
        this.localeResolver = localeResolver;
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
     * 권한 거부 — @PreAuthorize/Method Security/StoreAccessGuard 거부.
     */
    @ExceptionHandler({
            org.springframework.security.access.AccessDeniedException.class,
            org.springframework.security.authorization.AuthorizationDeniedException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(Exception e) {
        log.warn("권한 거부: {}", e.getMessage());
        ApiResponse<Object> response = ApiResponse.error("FORBIDDEN",
                e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : "해당 작업에 대한 권한이 없어요.");
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
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
        log.error("ValidationException: {}", e.getMessage(), e);

        Locale locale = getCurrentLocale();
        BindingResult bindingResult = e.getBindingResult();
        Map<String, String> fieldErrors = new HashMap<>();

        for (FieldError fieldError : bindingResult.getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        String errorMessage = messageSource.getMessage("error.validation.failed", null, locale);
        ApiResponse<Map<String, String>> response = ApiResponse.error(ErrorCode.VALIDATION_ERROR.getCode(), errorMessage, fieldErrors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
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
