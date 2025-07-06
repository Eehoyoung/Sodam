package com.rich.sodam.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.MessageSource;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 다국어 메시지 소스 테스트
 */
@SpringBootTest
class MessageConfigTest {

    @Autowired
    private MessageSource messageSource;

    @Test
    void testKoreanMessages() {
        // Given
        Locale koreanLocale = Locale.KOREAN;

        // When & Then
        String kakaoSuccess = messageSource.getMessage("auth.kakao.success", null, koreanLocale);
        assertEquals("카카오 로그인이 성공적으로 완료되었습니다.", kakaoSuccess);

        String loginSuccess = messageSource.getMessage("auth.login.success", null, koreanLocale);
        assertEquals("로그인이 성공적으로 완료되었습니다.", loginSuccess);

        String joinSuccess = messageSource.getMessage("auth.join.success", null, koreanLocale);
        assertEquals("회원가입이 성공적으로 완료되었습니다.", joinSuccess);

        String userNotFound = messageSource.getMessage("auth.user.not.found", null, koreanLocale);
        assertEquals("사용자를 찾을 수 없습니다.", userNotFound);

        String validationFailed = messageSource.getMessage("error.validation.failed", null, koreanLocale);
        assertEquals("입력값 검증 실패", validationFailed);

        String resourceNotFound = messageSource.getMessage("error.resource.not.found", null, koreanLocale);
        assertEquals("요청한 리소스를 찾을 수 없습니다.", resourceNotFound);

        String internalServer = messageSource.getMessage("error.internal.server", null, koreanLocale);
        assertEquals("서버 내부 오류가 발생했습니다.", internalServer);
    }

    @Test
    void testEnglishMessages() {
        // Given
        Locale englishLocale = Locale.ENGLISH;

        // When & Then
        String kakaoSuccess = messageSource.getMessage("auth.kakao.success", null, englishLocale);
        assertEquals("Kakao login completed successfully.", kakaoSuccess);

        String loginSuccess = messageSource.getMessage("auth.login.success", null, englishLocale);
        assertEquals("Login completed successfully.", loginSuccess);

        String joinSuccess = messageSource.getMessage("auth.join.success", null, englishLocale);
        assertEquals("Registration completed successfully.", joinSuccess);

        String userNotFound = messageSource.getMessage("auth.user.not.found", null, englishLocale);
        assertEquals("User not found.", userNotFound);

        String validationFailed = messageSource.getMessage("error.validation.failed", null, englishLocale);
        assertEquals("Input validation failed", validationFailed);

        String resourceNotFound = messageSource.getMessage("error.resource.not.found", null, englishLocale);
        assertEquals("Requested resource not found.", resourceNotFound);

        String internalServer = messageSource.getMessage("error.internal.server", null, englishLocale);
        assertEquals("Internal server error occurred.", internalServer);
    }

    @Test
    void testMessageWithParameters() {
        // Given
        Locale koreanLocale = Locale.KOREAN;
        Locale englishLocale = Locale.ENGLISH;
        String errorDetail = "Connection timeout";

        // When & Then
        String koreanMessage = messageSource.getMessage("auth.kakao.failed", new Object[]{errorDetail}, koreanLocale);
        assertEquals("카카오 인증 실패: Connection timeout", koreanMessage);

        String englishMessage = messageSource.getMessage("auth.kakao.failed", new Object[]{errorDetail}, englishLocale);
        assertEquals("Kakao authentication failed: Connection timeout", englishMessage);
    }

    @Test
    void testMessageSourceNotNull() {
        assertNotNull(messageSource);
    }
}
