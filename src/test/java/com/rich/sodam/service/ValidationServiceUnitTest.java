package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * ValidationService 단위 테스트
 * 특히 isDuplicate 메서드의 기능을 테스트합니다.
 */
@ExtendWith(MockitoExtension.class)
class ValidationServiceUnitTest {

    @Mock
    private StoreRepository storeRepository;

    private ValidationService validationService;

    @BeforeEach
    void setUp() {
        validationService = new ValidationService(storeRepository);
    }

    @Test
    @DisplayName("사업자등록번호 중복 검증 - 중복된 경우")
    void isDuplicate_DuplicateBusinessNumber() {
        // given
        String businessNumber = "1234567890";
        Store store = new Store("테스트 매장", businessNumber, "02-1234-5678", "음식점", 10000);
        when(storeRepository.findByBusinessNumber(businessNumber)).thenReturn(Optional.of(store));

        // when
        boolean result = validationService.isDuplicate(businessNumber);

        // then
        assertThat(result).isTrue();
        verify(storeRepository, times(1)).findByBusinessNumber(businessNumber);
    }

    @Test
    @DisplayName("사업자등록번호 중복 검증 - 중복되지 않은 경우")
    void isDuplicate_NonDuplicateBusinessNumber() {
        // given
        String businessNumber = "1234567890";
        when(storeRepository.findByBusinessNumber(businessNumber)).thenReturn(Optional.empty());

        // when
        boolean result = validationService.isDuplicate(businessNumber);

        // then
        assertThat(result).isFalse();
        verify(storeRepository, times(1)).findByBusinessNumber(businessNumber);
    }

    @Test
    @DisplayName("사업자등록번호 중복 검증 - 유효하지 않은 형식")
    void isDuplicate_InvalidFormat() {
        // given
        String invalidBusinessNumber = "123456789"; // 9자리 (10자리여야 함)

        // when
        boolean result = validationService.isDuplicate(invalidBusinessNumber);

        // then
        assertThat(result).isFalse();
        verify(storeRepository, never()).findByBusinessNumber(anyString());
    }

    @Test
    @DisplayName("사업자등록번호 중복 검증 - 예외 발생 시")
    void isDuplicate_ExceptionThrown() {
        // given
        String businessNumber = "1234567890";
        when(storeRepository.findByBusinessNumber(businessNumber)).thenThrow(new RuntimeException("데이터베이스 오류"));

        // when
        boolean result = validationService.isDuplicate(businessNumber);

        // then
        assertThat(result).isFalse();
        verify(storeRepository, times(1)).findByBusinessNumber(businessNumber);
    }
}
