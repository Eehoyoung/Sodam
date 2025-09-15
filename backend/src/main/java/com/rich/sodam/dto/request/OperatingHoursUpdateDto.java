package com.rich.sodam.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * 매장 운영시간 업데이트 요청 DTO
 * 요일별 운영시간 정보를 받아서 매장의 운영시간을 설정합니다.
 */
@Data
@Schema(description = "매장 운영시간 업데이트 요청")
public class OperatingHoursUpdateDto {

    @NotNull(message = "운영시간 정보는 필수입니다.")
    @Valid
    @Schema(description = "요일별 운영시간 목록", required = true)
    private List<DayOperatingHours> operatingHours;

    /**
     * 전체 운영시간 유효성 검증
     */
    public void validate() {
        if (operatingHours == null || operatingHours.isEmpty()) {
            throw new IllegalArgumentException("운영시간 정보는 필수입니다.");
        }

        // 모든 요일이 포함되어 있는지 확인
        if (operatingHours.size() != 7) {
            throw new IllegalArgumentException("모든 요일(월~일)의 운영시간 정보가 필요합니다.");
        }

        // 각 요일별 유효성 검증
        for (DayOperatingHours dayHours : operatingHours) {
            dayHours.validate();
        }

        // 모든 요일이 휴무인지 확인
        boolean allClosed = operatingHours.stream()
                .allMatch(dayHours -> Boolean.TRUE.equals(dayHours.getIsClosed()));

        if (allClosed) {
            throw new IllegalArgumentException("최소 하나의 요일은 운영해야 합니다.");
        }

        // 중복 요일 확인
        long distinctDays = operatingHours.stream()
                .map(DayOperatingHours::getDayOfWeek)
                .distinct()
                .count();

        if (distinctDays != 7) {
            throw new IllegalArgumentException("중복된 요일이 있거나 누락된 요일이 있습니다.");
        }
    }

    /**
     * 요일별 운영시간 정보
     */
    @Data
    @Schema(description = "요일별 운영시간 정보")
    public static class DayOperatingHours {

        @NotNull(message = "요일은 필수입니다.")
        @Schema(description = "요일 (MONDAY, TUESDAY, ..., SUNDAY)", required = true, example = "MONDAY")
        private DayOfWeek dayOfWeek;

        @Schema(description = "시작시간 (HH:mm 형식)", example = "09:00")
        private LocalTime openTime;

        @Schema(description = "종료시간 (HH:mm 형식)", example = "18:00")
        private LocalTime closeTime;

        @Schema(description = "휴무 여부", example = "false")
        private Boolean isClosed = false;

        /**
         * 운영시간 유효성 검증
         */
        public void validate() {
            if (Boolean.TRUE.equals(isClosed)) {
                // 휴무일인 경우 시간 설정 불필요
                return;
            }

            if (openTime == null || closeTime == null) {
                throw new IllegalArgumentException(
                        String.format("%s 운영일의 시작시간과 종료시간은 필수입니다.", dayOfWeek.name())
                );
            }

            if (openTime.isAfter(closeTime)) {
                throw new IllegalArgumentException(
                        String.format("%s 시작시간은 종료시간보다 빨라야 합니다.", dayOfWeek.name())
                );
            }

            if (openTime.equals(closeTime)) {
                throw new IllegalArgumentException(
                        String.format("%s 시작시간과 종료시간은 달라야 합니다.", dayOfWeek.name())
                );
            }
        }
    }
}
