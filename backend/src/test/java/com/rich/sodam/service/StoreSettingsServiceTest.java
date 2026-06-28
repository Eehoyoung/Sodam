package com.rich.sodam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.OperatingHoursUpdateDto;
import com.rich.sodam.dto.request.OperatingHoursUpdateDto.DayOperatingHours;
import com.rich.sodam.dto.request.StoreRegistrationDto;
import com.rich.sodam.dto.response.OperatingHoursResponseDto;
import com.rich.sodam.dto.response.WageHistoryDto;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreSettingsServiceTest {

    @Autowired private StoreManagementServiceImpl service;
    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;

    private Long store() {
        Store s = new Store("settings-store", "1112223334", "02-1", "cafe", 12_000, 100);
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

    private List<DayOperatingHours> fullWeek(LocalTime open, LocalTime close) {
        List<DayOperatingHours> days = new ArrayList<>();
        for (DayOfWeek day : DayOfWeek.values()) {
            days.add(day(day, open, close, false));
        }
        return days;
    }

    @Test
    @DisplayName("operating hours round trip")
    void operatingHoursRoundTrip() {
        Long storeId = store();
        OperatingHoursUpdateDto dto = new OperatingHoursUpdateDto();
        List<DayOperatingHours> days = fullWeek(LocalTime.of(10, 0), LocalTime.of(20, 0));
        days.set(0, day(DayOfWeek.MONDAY, null, null, true));
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
    @DisplayName("register store reflects operating hours")
    void registerStoreReflectsOperatingHours() {
        User user = userRepository.save(new User("store-master@sodam.test", "master"));
        StoreRegistrationDto dto = new StoreRegistrationDto();
        dto.setStoreName("registered-store");
        dto.setBusinessNumber("5556667778");
        dto.setStorePhoneNumber("02-555-7778");
        dto.setBusinessType("cafe");
        dto.setBusinessLicenseNumber("LIC-7778");
        dto.setStoreStandardHourWage(12_000);
        List<DayOperatingHours> days = fullWeek(LocalTime.of(9, 0), LocalTime.of(18, 0));
        days.set(0, day(DayOfWeek.MONDAY, LocalTime.of(7, 30), LocalTime.of(16, 0), false));
        days.set(6, day(DayOfWeek.SUNDAY, null, null, true));
        dto.setOperatingHours(days);

        Store store = service.registerStoreWithMaster(user.getId(), dto);

        assertThat(store.getOperatingHours().getOpenTime(DayOfWeek.MONDAY)).isEqualTo(LocalTime.of(7, 30));
        assertThat(store.getOperatingHours().getCloseTime(DayOfWeek.MONDAY)).isEqualTo(LocalTime.of(16, 0));
        assertThat(store.getOperatingHours().isOpenOn(DayOfWeek.SUNDAY)).isFalse();
        assertThat(store.getOperatingHours().getOpenTime(DayOfWeek.TUESDAY)).isEqualTo(LocalTime.of(9, 0));
    }

    @Test
    @DisplayName("registration operating hours parse flexible time strings")
    void registrationOperatingHoursParsesFlexibleTimes() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        String json = """
                {
                  "operatingHours": [
                    {"dayOfWeek":"MONDAY","openTime":"09:30:00","closeTime":"18:00","isClosed":false},
                    {"dayOfWeek":"TUESDAY","openTime":"0930","closeTime":"1800","isClosed":false}
                  ]
                }
                """;

        StoreRegistrationDto dto = objectMapper.readValue(json, StoreRegistrationDto.class);

        assertThat(dto.getOperatingHours().get(0).getOpenTime()).isEqualTo(LocalTime.of(9, 30));
        assertThat(dto.getOperatingHours().get(0).getCloseTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(dto.getOperatingHours().get(1).getOpenTime()).isEqualTo(LocalTime.of(9, 30));
        assertThat(dto.getOperatingHours().get(1).getCloseTime()).isEqualTo(LocalTime.of(18, 0));
    }

    @Test
    @DisplayName("HHmm validation messages are distinct")
    void hhmmValidationMessages() {
        ObjectMapper objectMapper = new ObjectMapper();
        String notFourDigits = """
                {"operatingHours":[{"dayOfWeek":"MONDAY","openTime":"930","closeTime":"1800","isClosed":false}]}
                """;
        String outOfRange = """
                {"operatingHours":[{"dayOfWeek":"MONDAY","openTime":"2460","closeTime":"1800","isClosed":false}]}
                """;

        assertThatThrownBy(() -> objectMapper.readValue(notFourDigits, StoreRegistrationDto.class))
                .hasMessageContaining("4\uc790\ub9ac \uc22b\uc790\ub97c \uc801\uc5b4\uc8fc\uc138\uc694");
        assertThatThrownBy(() -> objectMapper.readValue(outOfRange, StoreRegistrationDto.class))
                .hasMessageContaining("\ub2e4\uc2dc\uc785\ub825\ud574 \uc8fc\uc138\uc694");
    }

    @Test
    @DisplayName("store wage history is recorded")
    void wageHistoryRecorded() {
        Long storeId = store();
        service.updateStoreStandardWage(storeId, 11_000);

        List<WageHistoryDto> hist = service.getStoreWageHistory(storeId);
        assertThat(hist).isNotEmpty();
        assertThat(hist.get(0).hourlyWage()).isEqualTo(11_000);
        assertThat(hist.get(0).scope()).isEqualTo("STORE_DEFAULT");
    }
}
