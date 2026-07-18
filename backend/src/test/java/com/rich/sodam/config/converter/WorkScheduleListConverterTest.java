package com.rich.sodam.config.converter;

import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkScheduleListConverterTest {

    private final WorkScheduleListConverter converter = new WorkScheduleListConverter();

    @Test
    @DisplayName("스케줄 리스트 ↔ JSON 라운드트립 — 야간·휴게 null 포함")
    void roundTrip() {
        List<WorkScheduleDay> schedule = List.of(
                new WorkScheduleDay(DayOfWeek.MONDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), null, null),
                new WorkScheduleDay(DayOfWeek.SATURDAY, LocalTime.of(20, 0), LocalTime.of(5, 0),
                        LocalTime.of(0, 0), LocalTime.of(1, 0)));

        String json = converter.convertToDatabaseColumn(schedule);
        List<WorkScheduleDay> restored = converter.convertToEntityAttribute(json);

        assertThat(json).contains("\"MONDAY\"").contains("17:00").doesNotContain("[17,");
        assertThat(json.length()).isLessThanOrEqualTo(2000); // V38 컬럼 길이 내(요일 7개까지 여유)
        assertThat(restored).isEqualTo(schedule);
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
    @DisplayName("손상 JSON 은 조용히 null 이 아니라 명시적으로 실패한다(직접 입력 모드 오인 방지)")
    void corruptedJsonFailsLoudly() {
        assertThatThrownBy(() -> converter.convertToEntityAttribute("{broken"))
                .isInstanceOf(IllegalStateException.class);
    }
}
