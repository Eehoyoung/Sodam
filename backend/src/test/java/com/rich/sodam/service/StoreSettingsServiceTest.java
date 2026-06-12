package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.request.OperatingHoursUpdateDto;
import com.rich.sodam.dto.request.OperatingHoursUpdateDto.DayOperatingHours;
import com.rich.sodam.dto.response.OperatingHoursResponseDto;
import com.rich.sodam.dto.response.WageHistoryDto;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 매장 설정(운영시간·시급 이력) 서비스 — 사장이 매장 설정을 관리하는 경로 검증.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreSettingsServiceTest {

    @Autowired private StoreManagementServiceImpl service;
    @Autowired private StoreRepository storeRepository;

    private Long store() {
        Store s = new Store("설정매장", "1112223334", "02-1", "카페", 12_000, 100);
        return storeRepository.save(s).getId();
    }

    private DayOperatingHours day(DayOfWeek d, LocalTime open, LocalTime close, boolean closed) {
        DayOperatingHours x = new DayOperatingHours();
        x.setDayOfWeek(d);
        x.setOpenTime(open);
        x.setCloseTime(close);
        x.setIsClosed(closed);
        return x;
    }

    @Test
    @DisplayName("운영시간 수정→조회 라운드트립 (월 휴무·화 10~20)")
    void operatingHoursRoundTrip() {
        Long storeId = store();
        OperatingHoursUpdateDto dto = new OperatingHoursUpdateDto();
        List<DayOperatingHours> days = new ArrayList<>();
        days.add(day(DayOfWeek.MONDAY, null, null, true));
        days.add(day(DayOfWeek.TUESDAY, LocalTime.of(10, 0), LocalTime.of(20, 0), false));
        dto.setOperatingHours(days);

        service.updateOperatingHours(storeId, dto);
        OperatingHoursResponseDto res = service.getOperatingHours(storeId);

        assertThat(res.getOperatingHours()).hasSize(7);
        var mon = res.getOperatingHours().stream()
                .filter(o -> o.getDayOfWeek() == DayOfWeek.MONDAY).findFirst().orElseThrow();
        var tue = res.getOperatingHours().stream()
                .filter(o -> o.getDayOfWeek() == DayOfWeek.TUESDAY).findFirst().orElseThrow();
        assertThat(mon.getIsClosed()).isTrue();
        assertThat(tue.getIsClosed()).isFalse();
        assertThat(tue.getOpenTime()).isEqualTo(LocalTime.of(10, 0));
    }

    @Test
    @DisplayName("매장 기본 시급 변경 시 이력이 기록되고 조회된다")
    void wageHistoryRecorded() {
        Long storeId = store();
        service.updateStoreStandardWage(storeId, 11_000);

        List<WageHistoryDto> hist = service.getStoreWageHistory(storeId);
        assertThat(hist).isNotEmpty();
        assertThat(hist.get(0).hourlyWage()).isEqualTo(11_000);
        assertThat(hist.get(0).scope()).isEqualTo("STORE_DEFAULT");
    }
}
