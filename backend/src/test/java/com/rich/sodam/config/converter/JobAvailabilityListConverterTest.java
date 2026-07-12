package com.rich.sodam.config.converter;

import com.rich.sodam.domain.JobAvailabilityDay;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JobAvailabilityListConverterTest {

    private final JobAvailabilityListConverter converter = new JobAvailabilityListConverter();

    @Test
    @DisplayName("요일별 근무가능 시간 리스트 ↔ JSON 라운드트립 — 손실 없이 복원")
    void roundTrip() {
        List<JobAvailabilityDay> availability = List.of(
                new JobAvailabilityDay(DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(18, 0)),
                new JobAvailabilityDay(DayOfWeek.WEDNESDAY, LocalTime.of(10, 0), LocalTime.of(18, 0)),
                new JobAvailabilityDay(DayOfWeek.SATURDAY, LocalTime.of(18, 0), LocalTime.of(22, 0)));

        String json = converter.convertToDatabaseColumn(availability);
        List<JobAvailabilityDay> restored = converter.convertToEntityAttribute(json);

        assertThat(json).contains("\"MONDAY\"").contains("10:00").doesNotContain("[10,");
        assertThat(json.length()).isLessThanOrEqualTo(2000); // V53 컬럼 길이(요일 7개까지 여유)
        assertThat(restored).isEqualTo(availability);
    }

    @Test
    @DisplayName("null·빈 리스트는 NULL 컬럼, NULL·빈 문자열은 null 속성")
    void nullAndEmptyHandling() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToDatabaseColumn(List.of())).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
        assertThat(converter.convertToEntityAttribute(" ")).isNull();
    }

    @Test
    @DisplayName("손상 JSON 은 조용히 null 이 아니라 명시적으로 실패한다(구직 자격 오판정 방지)")
    void corruptedJsonFailsLoudly() {
        assertThatThrownBy(() -> converter.convertToEntityAttribute("{broken"))
                .isInstanceOf(IllegalStateException.class);
    }
}
