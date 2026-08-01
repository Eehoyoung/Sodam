package com.rich.sodam.domain;

import com.rich.sodam.domain.type.PurchaseCategory;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PurchaseAmountIntegrityTest {

    @Test
    void rejectsLineItemAmountsThatOverflowThePersistedIntegerAmount() {
        assertThatThrownBy(() -> PurchaseItem.of("overflow", 2d, "EA", Integer.MAX_VALUE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsPurchaseTotalsThatOverflowThePersistedIntegerAmount() {
        Store store = new Store("amount-test", "1000000000", "02-1", "Seoul", 12_000, 100);
        Purchase purchase = Purchase.create(store, "vendor", LocalDate.of(2026, 7, 30),
                PurchaseCategory.ETC);
        purchase.addItem(PurchaseItem.of("first", 1d, "EA", 2_000_000_000));
        purchase.addItem(PurchaseItem.of("second", 1d, "EA", 2_000_000_000));

        assertThatThrownBy(purchase::recalcTotal)
                .isInstanceOf(IllegalArgumentException.class);
    }
}
