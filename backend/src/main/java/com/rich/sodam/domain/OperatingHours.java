package com.rich.sodam.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * 매장 운영시간 정보를 나타내는 임베디드 클래스
 * 요일별 운영시간 및 휴무일 정보를 관리합니다.
 */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OperatingHours {

    // 월요일
    @Column(name = "monday_open")
    private LocalTime mondayOpen;

    @Column(name = "monday_close")
    private LocalTime mondayClose;

    @Column(name = "monday_is_closed")
    private Boolean mondayIsClosed = false;

    // 화요일
    @Column(name = "tuesday_open")
    private LocalTime tuesdayOpen;

    @Column(name = "tuesday_close")
    private LocalTime tuesdayClose;

    @Column(name = "tuesday_is_closed")
    private Boolean tuesdayIsClosed = false;

    // 수요일
    @Column(name = "wednesday_open")
    private LocalTime wednesdayOpen;

    @Column(name = "wednesday_close")
    private LocalTime wednesdayClose;

    @Column(name = "wednesday_is_closed")
    private Boolean wednesdayIsClosed = false;

    // 목요일
    @Column(name = "thursday_open")
    private LocalTime thursdayOpen;

    @Column(name = "thursday_close")
    private LocalTime thursdayClose;

    @Column(name = "thursday_is_closed")
    private Boolean thursdayIsClosed = false;

    // 금요일
    @Column(name = "friday_open")
    private LocalTime fridayOpen;

    @Column(name = "friday_close")
    private LocalTime fridayClose;

    @Column(name = "friday_is_closed")
    private Boolean fridayIsClosed = false;

    // 토요일
    @Column(name = "saturday_open")
    private LocalTime saturdayOpen;

    @Column(name = "saturday_close")
    private LocalTime saturdayClose;

    @Column(name = "saturday_is_closed")
    private Boolean saturdayIsClosed = false;

    // 일요일
    @Column(name = "sunday_open")
    private LocalTime sundayOpen;

    @Column(name = "sunday_close")
    private LocalTime sundayClose;

    @Column(name = "sunday_is_closed")
    private Boolean sundayIsClosed = false;

    /**
     * 기본 운영시간으로 초기화 (09:00-18:00, 일요일 휴무)
     */
    public static OperatingHours createDefault() {
        OperatingHours operatingHours = new OperatingHours();
        LocalTime defaultOpen = LocalTime.of(9, 0);
        LocalTime defaultClose = LocalTime.of(18, 0);

        // 월~토 09:00-18:00 설정
        operatingHours.mondayOpen = defaultOpen;
        operatingHours.mondayClose = defaultClose;
        operatingHours.tuesdayOpen = defaultOpen;
        operatingHours.tuesdayClose = defaultClose;
        operatingHours.wednesdayOpen = defaultOpen;
        operatingHours.wednesdayClose = defaultClose;
        operatingHours.thursdayOpen = defaultOpen;
        operatingHours.thursdayClose = defaultClose;
        operatingHours.fridayOpen = defaultOpen;
        operatingHours.fridayClose = defaultClose;
        operatingHours.saturdayOpen = defaultOpen;
        operatingHours.saturdayClose = defaultClose;

        // 일요일 휴무
        operatingHours.sundayIsClosed = true;

        return operatingHours;
    }

    /**
     * 특정 요일의 운영시간 설정
     *
     * @param dayOfWeek 요일
     * @param openTime  시작시간
     * @param closeTime 종료시간
     * @param isClosed  휴무 여부
     */
    public void setDayOperatingHours(DayOfWeek dayOfWeek, LocalTime openTime, LocalTime closeTime, Boolean isClosed) {
        validateOperatingTime(openTime, closeTime, isClosed);

        switch (dayOfWeek) {
            case MONDAY:
                this.mondayOpen = isClosed ? null : openTime;
                this.mondayClose = isClosed ? null : closeTime;
                this.mondayIsClosed = isClosed;
                break;
            case TUESDAY:
                this.tuesdayOpen = isClosed ? null : openTime;
                this.tuesdayClose = isClosed ? null : closeTime;
                this.tuesdayIsClosed = isClosed;
                break;
            case WEDNESDAY:
                this.wednesdayOpen = isClosed ? null : openTime;
                this.wednesdayClose = isClosed ? null : closeTime;
                this.wednesdayIsClosed = isClosed;
                break;
            case THURSDAY:
                this.thursdayOpen = isClosed ? null : openTime;
                this.thursdayClose = isClosed ? null : closeTime;
                this.thursdayIsClosed = isClosed;
                break;
            case FRIDAY:
                this.fridayOpen = isClosed ? null : openTime;
                this.fridayClose = isClosed ? null : closeTime;
                this.fridayIsClosed = isClosed;
                break;
            case SATURDAY:
                this.saturdayOpen = isClosed ? null : openTime;
                this.saturdayClose = isClosed ? null : closeTime;
                this.saturdayIsClosed = isClosed;
                break;
            case SUNDAY:
                this.sundayOpen = isClosed ? null : openTime;
                this.sundayClose = isClosed ? null : closeTime;
                this.sundayIsClosed = isClosed;
                break;
        }
    }

    /**
     * 특정 요일의 운영 여부 확인
     *
     * @param dayOfWeek 요일
     * @return 운영 중이면 true, 휴무면 false
     */
    public boolean isOpenOn(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> !Boolean.TRUE.equals(mondayIsClosed);
            case TUESDAY -> !Boolean.TRUE.equals(tuesdayIsClosed);
            case WEDNESDAY -> !Boolean.TRUE.equals(wednesdayIsClosed);
            case THURSDAY -> !Boolean.TRUE.equals(thursdayIsClosed);
            case FRIDAY -> !Boolean.TRUE.equals(fridayIsClosed);
            case SATURDAY -> !Boolean.TRUE.equals(saturdayIsClosed);
            case SUNDAY -> !Boolean.TRUE.equals(sundayIsClosed);
        };
    }

    /**
     * 특정 요일의 시작시간 조회
     *
     * @param dayOfWeek 요일
     * @return 시작시간 (휴무일인 경우 null)
     */
    public LocalTime getOpenTime(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> mondayOpen;
            case TUESDAY -> tuesdayOpen;
            case WEDNESDAY -> wednesdayOpen;
            case THURSDAY -> thursdayOpen;
            case FRIDAY -> fridayOpen;
            case SATURDAY -> saturdayOpen;
            case SUNDAY -> sundayOpen;
        };
    }

    /**
     * 특정 요일의 종료시간 조회
     *
     * @param dayOfWeek 요일
     * @return 종료시간 (휴무일인 경우 null)
     */
    public LocalTime getCloseTime(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> mondayClose;
            case TUESDAY -> tuesdayClose;
            case WEDNESDAY -> wednesdayClose;
            case THURSDAY -> thursdayClose;
            case FRIDAY -> fridayClose;
            case SATURDAY -> saturdayClose;
            case SUNDAY -> sundayClose;
        };
    }

    /**
     * 운영시간 검증
     *
     * @param openTime  시작시간
     * @param closeTime 종료시간
     * @param isClosed  휴무 여부
     */
    private void validateOperatingTime(LocalTime openTime, LocalTime closeTime, Boolean isClosed) {
        if (Boolean.TRUE.equals(isClosed)) {
            // 휴무일인 경우 시간 설정 불필요
            return;
        }

        if (openTime == null || closeTime == null) {
            throw new IllegalArgumentException("운영일의 시작시간과 종료시간은 필수입니다.");
        }

        if (openTime.isAfter(closeTime)) {
            throw new IllegalArgumentException("시작시간은 종료시간보다 빨라야 합니다.");
        }

        if (openTime.equals(closeTime)) {
            throw new IllegalArgumentException("시작시간과 종료시간은 달라야 합니다.");
        }
    }

    /**
     * 전체 운영시간 검증
     */
    public void validateOperatingHours() {
        validateOperatingTime(mondayOpen, mondayClose, mondayIsClosed);
        validateOperatingTime(tuesdayOpen, tuesdayClose, tuesdayIsClosed);
        validateOperatingTime(wednesdayOpen, wednesdayClose, wednesdayIsClosed);
        validateOperatingTime(thursdayOpen, thursdayClose, thursdayIsClosed);
        validateOperatingTime(fridayOpen, fridayClose, fridayIsClosed);
        validateOperatingTime(saturdayOpen, saturdayClose, saturdayIsClosed);
        validateOperatingTime(sundayOpen, sundayClose, sundayIsClosed);

        // 모든 요일이 휴무인지 확인
        boolean allClosed = Boolean.TRUE.equals(mondayIsClosed) &&
                Boolean.TRUE.equals(tuesdayIsClosed) &&
                Boolean.TRUE.equals(wednesdayIsClosed) &&
                Boolean.TRUE.equals(thursdayIsClosed) &&
                Boolean.TRUE.equals(fridayIsClosed) &&
                Boolean.TRUE.equals(saturdayIsClosed) &&
                Boolean.TRUE.equals(sundayIsClosed);

        if (allClosed) {
            throw new IllegalArgumentException("최소 하나의 요일은 운영해야 합니다.");
        }
    }
}
