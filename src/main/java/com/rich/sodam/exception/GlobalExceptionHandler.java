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
     * 기타 예외 처리 (폴백)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleException(Exception e) {
        log.error("Unhandled exception: {}", e.getMessage(), e);

        Locale locale = getCurrentLocale();
        String errorMessage = messageSource.getMessage("error.internal.server", null, locale);
        ApiResponse<Object> response = ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR.getCode(), errorMessage);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

}
