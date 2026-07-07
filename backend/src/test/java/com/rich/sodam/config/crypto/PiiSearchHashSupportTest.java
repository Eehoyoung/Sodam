package com.rich.sodam.config.crypto;

import com.rich.sodam.domain.Store;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PiiSearchHashSupport(§2.6 블라인드 인덱스) 단위 테스트.
 * Spring 컨텍스트 없이 순수 static 유틸로 동작해야 한다 — 다수의 도메인 테스트가
 * Spring 부트스트랩 없이 {@code new Store(...)}를 직접 생성하기 때문.
 */
class PiiSearchHashSupportTest {

    @Test
    @DisplayName("같은 사업자등록번호는 항상 같은 해시를 낸다(결정론적)")
    void sameInputProducesSameHash() {
        String h1 = PiiSearchHashSupport.hashBusinessNumber("1234567890");
        String h2 = PiiSearchHashSupport.hashBusinessNumber("1234567890");

        assertThat(h1).isEqualTo(h2);
        assertThat(h1).hasSize(64); // SHA-256 HMAC → 32 byte → hex 64자
    }

    @Test
    @DisplayName("하이픈 등 구분자가 섞여도 정규화 후 동일한 해시를 낸다")
    void normalizesNonDigitCharactersBeforeHashing() {
        String withHyphens = PiiSearchHashSupport.hashBusinessNumber("123-45-67890");
        String digitsOnly = PiiSearchHashSupport.hashBusinessNumber("1234567890");

        assertThat(withHyphens).isEqualTo(digitsOnly);
    }

    @Test
    @DisplayName("다른 사업자등록번호는 다른 해시를 낸다")
    void differentInputProducesDifferentHash() {
        String h1 = PiiSearchHashSupport.hashBusinessNumber("1234567890");
        String h2 = PiiSearchHashSupport.hashBusinessNumber("0987654321");

        assertThat(h1).isNotEqualTo(h2);
    }

    @Test
    @DisplayName("null 입력은 null 해시를 반환한다")
    void nullInputProducesNullHash() {
        assertThat(PiiSearchHashSupport.hashBusinessNumber(null)).isNull();
    }

    @Test
    @DisplayName("Store 생성 시 businessNumberSearchHash/버전이 자동으로 채워진다")
    void storeConstructorPopulatesSearchHash() {
        Store store = new Store("테스트 매장", "1234567890", "02-1234-5678", "음식점", 10000, 100);

        assertThat(store.getBusinessNumberSearchHash())
                .isEqualTo(PiiSearchHashSupport.hashBusinessNumber("1234567890"));
        assertThat(store.getBusinessNumberPepperVersion()).isEqualTo(PiiSearchHashSupport.currentVersion());
    }
}
