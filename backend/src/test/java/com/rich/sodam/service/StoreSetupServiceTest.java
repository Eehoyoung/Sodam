package com.rich.sodam.service;

import com.rich.sodam.domain.OperatingHours;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.StoreSetupResponse;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 매장 설정 완성도 + 다음 한 가지 액션 (GR-NEW-06).
 *
 * <p>실제 {@link Store}·{@link OperatingHours} 객체로 검증(도메인 게터가 단순 필드라 모킹 불필요).
 */
class StoreSetupServiceTest {

    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final StoreSetupService service = new StoreSetupService(storeRepository);

    /** 매장정보·기준시급은 항상 채워진 매장. 위치·운영시간은 인자로 제어. */
    private Store store(boolean withLocation, boolean withOperatingHours) {
        Store s = new Store("카페 소담", "1234567890", "021234567", "카페", 10030, 100);
        if (withLocation) {
            s.updateLocation(37.5, 127.0, "서울시 어딘가", 100);
        } else {
            // 생성 직후 위치 미설정 상태 — 별도 처리 불필요
            s.setLatitude(null);
            s.setLongitude(null);
        }
        if (withOperatingHours) {
            OperatingHours hours = OperatingHours.createDefault();
            s.updateOperatingHours(hours);
        } else {
            // 전 요일 휴무로 만들어 "운영시간 미설정"으로 판정되게 함
            OperatingHours closed = OperatingHours.createDefault();
            for (DayOfWeek d : DayOfWeek.values()) {
                closed.setDayOperatingHours(d, null, null, true);
            }
            // 모든 요일 휴무 매장은 영업 요일이 없으므로 미완으로 계산됨 (검증 우회용 직접 주입)
            injectOperatingHours(s, closed);
        }
        return s;
    }

    /** updateOperatingHours 는 전 요일 휴무를 거부하므로, 테스트 한정 reflection 주입. */
    private void injectOperatingHours(Store s, OperatingHours hours) {
        try {
            var f = Store.class.getDeclaredField("operatingHours");
            f.setAccessible(true);
            f.set(s, hours);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    @DisplayName("모든 항목 완료: 완성도 100%·다음 액션 없음")
    void allDone() {
        when(storeRepository.findActiveById(eq(1L))).thenReturn(Optional.of(store(true, true)));
        when(storeRepository.countActiveEmployeesByStoreId(1L)).thenReturn(2);

        StoreSetupResponse res = service.completeness(1L);

        assertThat(res.completionRate()).isEqualTo(100);
        assertThat(res.nextActionKey()).isNull();
        assertThat(res.nextActionLabel()).isNull();
        assertThat(res.items()).hasSize(5).allMatch(StoreSetupResponse.SetupItem::done);
    }

    @Test
    @DisplayName("운영시간 미설정이 첫 미완: 다음 액션은 운영시간")
    void nextActionIsFirstIncomplete() {
        // 매장정보·시급 완료(2), 운영시간(전 요일 휴무)·위치·직원 미완 → 2/5 = 40%
        when(storeRepository.findActiveById(eq(2L))).thenReturn(Optional.of(store(false, false)));
        when(storeRepository.countActiveEmployeesByStoreId(2L)).thenReturn(0);

        StoreSetupResponse res = service.completeness(2L);

        assertThat(res.completionRate()).isEqualTo(40);
        assertThat(res.nextActionKey()).isEqualTo("OPERATING_HOURS");
        assertThat(res.nextActionLabel()).isEqualTo("운영시간");
        assertThat(res.items()).filteredOn(StoreSetupResponse.SetupItem::done).hasSize(2);
    }

    @Test
    @DisplayName("직원만 미등록: 80%·다음 액션은 직원 등록")
    void onlyEmployeeMissing() {
        when(storeRepository.findActiveById(eq(3L))).thenReturn(Optional.of(store(true, true)));
        when(storeRepository.countActiveEmployeesByStoreId(3L)).thenReturn(0);

        StoreSetupResponse res = service.completeness(3L);

        assertThat(res.completionRate()).isEqualTo(80);
        assertThat(res.nextActionKey()).isEqualTo("EMPLOYEE");
        assertThat(res.nextActionLabel()).isEqualTo("직원 1명 이상");
    }

    @Test
    @DisplayName("매장 없음: EntityNotFoundException")
    void storeNotFound() {
        when(storeRepository.findActiveById(eq(9L))).thenReturn(Optional.empty());
        assertThat(org.assertj.core.api.Assertions.catchThrowable(() -> service.completeness(9L)))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);
    }
}
