package com.rich.sodam.domain;

import com.rich.sodam.config.crypto.PiiSearchHashSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 0 PII 핫픽스 — Store.businessNumberSearchHash 백필 동작 검증.
 * 암호화 전환 이전 평문 로우(해시 컬럼 NULL)를 흉내내 backfillBusinessNumberSearchHash()가
 * 정확히 채우고, 이미 채워진 로우는 건드리지 않는지(멱등) 확인한다.
 */
class StoreBusinessNumberSearchHashTest {

    @Test
    @DisplayName("해시가 없는(레거시 평문) 로우는 백필로 해시가 채워진다")
    void backfillFillsMissingHash() throws Exception {
        Store store = new Store("테스트 매장", "1234567890", "02-1234-5678", "음식점", 10000, 100);
        clearHash(store);

        store.backfillBusinessNumberSearchHash();

        assertThat(store.getBusinessNumberSearchHash())
                .isEqualTo(PiiSearchHashSupport.hashBusinessNumber("1234567890"));
        assertThat(store.getBusinessNumberPepperVersion()).isEqualTo(PiiSearchHashSupport.currentVersion());
    }

    @Test
    @DisplayName("이미 해시가 있는 로우는 백필을 다시 실행해도 그대로 유지된다(멱등)")
    void backfillIsIdempotentWhenHashAlreadyPresent() {
        Store store = new Store("테스트 매장", "1234567890", "02-1234-5678", "음식점", 10000, 100);
        String originalHash = store.getBusinessNumberSearchHash();

        store.backfillBusinessNumberSearchHash();

        assertThat(store.getBusinessNumberSearchHash()).isEqualTo(originalHash);
    }

    private void clearHash(Store store) throws Exception {
        Field field = Store.class.getDeclaredField("businessNumberSearchHash");
        field.setAccessible(true);
        field.set(store, null);
    }
}
