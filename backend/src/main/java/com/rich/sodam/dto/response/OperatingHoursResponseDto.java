package com.rich.sodam.dto.response;

import com.rich.sodam.domain.OperatingHours;
import com.rich.sodam.domain.Store;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 매장 운영시간 조회 응답 DTO
 * 매장의 운영시간 정보를 클라이언트에게 전달합니다.
 */
@Data
@Builder
@Schema(description = "매장 운영시간 조회 응답")
public class OperatingHoursResponseDto {

    @Schema(description = "매장 ID", example = "1")
    private Long storeId;

    @Schema(description = "매장명", example = "소담 카페")
    private String storeName;

    @Schema(description = "현재 운영 중 여부", example = "true")
    private Boolean isCurrentlyOpen;

    @Schema(description = "요일별 운영시간 목록")
    private List<DayOperatingHoursResponse> operatingHours;

    /**
     * Store 엔티티로부터 OperatingHoursResponseDto 생성
     *
     * @param store 매장 엔티티
     * @return OperatingHoursResponseDto
     */
    public static OperatingHoursResponseDto from(Store store) {
        if (store == null) {
            throw new IllegalArgumentException("매장 정보는 필수입니다.");
        }

        OperatingHours operatingHours = store.getOperatingHours();
        List<DayOperatingHoursResponse> dayResponses = new ArrayList<>();

        // 월요일부터 일요일까지 순서대로 생성
        DayOfWeek[] daysOfWeek = {
                DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY
        };

        for (DayOfWeek dayOfWeek : daysOfWeek) {
            DayOperatingHoursResponse dayResponse = createDayResponse(operatingHours, dayOfWeek);
            dayResponses.add(dayResponse);
        }

        return OperatingHoursResponseDto.builder()
                .storeId(store.getId())
                .storeName(store.getStoreName())
                .isCurrentlyOpen(store.isOpenNow())
                .operatingHours(dayResponses)
                .build();
    }

    /**
     * 특정 요일의 운영시간 응답 정보 생성
     *
     * @param operatingHours 운영시간 정보
     * @param dayOfWeek      요일
     * @return DayOperatingHoursResponse
     */
    private static DayOperatingHoursResponse createDayResponse(OperatingHours operatingHours, DayOfWeek dayOfWeek) {
        if (operatingHours == null) {
            return createClosedDayResponse(dayOfWeek);
        }

        boolean isClosed = !operatingHours.isOpenOn(dayOfWeek);
        LocalTime openTime = operatingHours.getOpenTime(dayOfWeek);
        LocalTime closeTime = operatingHours.getCloseTime(dayOfWeek);

        return DayOperatingHoursResponse.builder()
                .dayOfWeek(dayOfWeek)
                .dayOfWeekKorean(getDayOfWeekKorean(dayOfWeek))
                .openTime(isClosed ? null : openTime)
                .closeTime(isClosed ? null : closeTime)
                .isClosed(isClosed)
                .operatingTimeString(createOperatingTimeString(isClosed, openTime, closeTime))
                .build();
    }

    /**
     * 휴무일 응답 정보 생성
     *
     * @param dayOfWeek 요일
     * @return DayOperatingHoursResponse
     */
    private static DayOperatingHoursResponse createClosedDayResponse(DayOfWeek dayOfWeek) {
        return DayOperatingHoursResponse.builder()
                .dayOfWeek(dayOfWeek)
                .dayOfWeekKorean(getDayOfWeekKorean(dayOfWeek))
                .openTime(null)
                .closeTime(null)
                .isClosed(true)
                .operatingTimeString("휴무")
                .build();
    }

    /**
     * 요일의 한국어 명칭 반환
     *
     * @param dayOfWeek 요일
     * @return 한국어 요일명
     */
    private static String getDayOfWeekKorean(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "월요일";
            case TUESDAY -> "화요일";
            case WEDNESDAY -> "수요일";
            case THURSDAY -> "목요일";
            case FRIDAY -> "금요일";
            case SATURDAY -> "토요일";
            case SUNDAY -> "일요일";
        };
    }

    /**
     * 운영시간 문자열 생성
     *
     * @param isClosed  휴무 여부
     * @param openTime  시작시간
     * @param closeTime 종료시간
     * @return 운영시간 문자열
     */
    private static String createOperatingTimeString(Boolean isClosed, LocalTime openTime, LocalTime closeTime) {
        if (Boolean.TRUE.equals(isClosed) || openTime == null || closeTime == null) {
            return "휴무";
        }

        return String.format("%s - %s",
                openTime.toString(),
                closeTime.toString());
    }

    /**
     * 매장이 현재 운영 중인지 여부를 문자열로 반환
     *
     * @return 운영 상태 문자열
     */
    public String getCurrentOperatingStatus() {
        if (Boolean.TRUE.equals(isCurrentlyOpen)) {
            return "운영 중";
        } else {
            return "운영 종료";
        }
    }

    /**
     * 오늘의 운영시간 정보 반환
     *
     * @return 오늘의 운영시간 정보
     */
    public DayOperatingHoursResponse getTodayOperatingHours() {
        DayOfWeek today = DayOfWeek.from(java.time.LocalDate.now());

        return operatingHours.stream()
                .filter(dayHours -> dayHours.getDayOfWeek() == today)
                .findFirst()
                .orElse(null);
    }

    /**
     * 요일별 운영시간 응답 정보
     */
    @Data
    @Builder
    @Schema(description = "요일별 운영시간 응답 정보")
    public static class DayOperatingHoursResponse {

        @Schema(description = "요일", example = "MONDAY")
        private DayOfWeek dayOfWeek;

        @Schema(description = "요일명 (한국어)", example = "월요일")
        private String dayOfWeekKorean;

        @Schema(description = "시작시간", example = "09:00")
        private LocalTime openTime;

        @Schema(description = "종료시간", example = "18:00")
        private LocalTime closeTime;

        @Schema(description = "휴무 여부", example = "false")
        private Boolean isClosed;

        @Schema(description = "운영시간 문자열", example = "09:00 - 18:00")
        private String operatingTimeString;
    }
}
