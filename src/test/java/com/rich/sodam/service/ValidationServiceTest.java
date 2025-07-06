package com.rich.sodam.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class ValidationServiceTest {

    @Autowired
    private ValidationService validationService;

    @Test
    @DisplayName("사업자 등록번호 형식 검증 - 유효한 형식")
    void validateFormat_ValidFormat() {
        // given
        String validBusinessNumber = "1234567890";

        // when
        boolean result = validationService.validateFormat(validBusinessNumber);

        // then
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("사업자 등록번호 형식 검증 - 유효하지 않은 형식 (숫자가 아닌 문자 포함)")
    void validateFormat_InvalidFormat_NonNumeric() {
        // given
        String invalidBusinessNumber = "123456789A";

        // when
        boolean result = validationService.validateFormat(invalidBusinessNumber);

        // then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("사업자 등록번호 형식 검증 - 유효하지 않은 형식 (길이가 짧음)")
    void validateFormat_InvalidFormat_TooShort() {
        // given
        String invalidBusinessNumber = "123456789";

        // when
        boolean result = validationService.validateFormat(invalidBusinessNumber);

        // then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("사업자 등록번호 형식 검증 - 유효하지 않은 형식 (길이가 김)")
    void validateFormat_InvalidFormat_TooLong() {
        // given
        String invalidBusinessNumber = "12345678901";

        // when
        boolean result = validationService.validateFormat(invalidBusinessNumber);

        // then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("사업자 등록번호 형식 검증 - null 입력")
    void validateFormat_NullInput() {
        // given
        String nullBusinessNumber = null;

        // when
        boolean result = validationService.validateFormat(nullBusinessNumber);

        // then
        assertThat(result).isFalse();
    }

    // 국세청 API 연동 검증 테스트는 실제 API 호출이 필요하므로
    // 테스트 환경에서는 실행하지 않거나, 별도의 테스트 환경 설정이 필요합니다.
    // 아래는 테스트 방법에 대한 주석입니다.
    /*
    @Test
    @DisplayName("국세청 API 연동 검증 - 유효한 사업자 등록번호")
    void validateWithTaxOffice_ValidBusinessNumber() {
        // 실제 테스트를 위해서는 유효한 사업자 등록번호와 API 키가 필요합니다.
        // 테스트 환경의 application-test.yml에 API 키를 설정해야 합니다.

        // given
        String validBusinessNumber = "1234567890"; // 실제 유효한 사업자 등록번호로 대체 필요

        // when
        boolean result = validationService.validateWithTaxOffice(validBusinessNumber);

        // then
        assertThat(result).isTrue();
    }
    */
}
