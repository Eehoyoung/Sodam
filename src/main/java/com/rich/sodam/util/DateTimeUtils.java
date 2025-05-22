package com.rich.sodam.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

/**
 * 날짜 및 시간 관련 유틸리티 클래스
 * 날짜/시간 계산, 변환, 포맷팅 기능을 제공합니다.
 */
public class DateTimeUtils {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    private DateTimeUtils() {
        // 유틸리티 클래스는 인스턴스화를 방지합니다.
    }

    /**
     * 오늘 날짜의 시작 시간(00:00:00) 반환
     */
    public static LocalDateTime getStartOfDay() {
        return LocalDate.now().atStartOfDay();
    }

    /**
     * 오늘 날짜의 종료 시간(23:59:59.999999999) 반환
     */
    public static LocalDateTime getEndOfDay() {
        return LocalDate.now().atTime(LocalTime.MAX);
    }

    /**
     * 특정 날짜의 시작 시간 반환
     */
    public static LocalDateTime getStartOfDay(LocalDate date) {
        return date.atStartOfDay();
    }

    /**
     * 특정 날짜의 종료 시간 반환
     */
    public static LocalDateTime getEndOfDay(LocalDate date) {
        return date.atTime(LocalTime.MAX);
    }

    /**
     * 특정 연도와 월의 시작일 반환
     */
    public static LocalDateTime getStartOfMonth(int year, int month) {
        return LocalDate.of(year, month, 1).atStartOfDay();
    }

    /**
     * 특정 연도와 월의 마지막일 반환
     */
    public static LocalDateTime getEndOfMonth(int year, int month) {
        return YearMonth.of(year, month)
                .atEndOfMonth()
                .atTime(LocalTime.MAX);
    }

    /**
     * 두 LocalDateTime 사이의 시간 차이를 분 단위로 계산
     */
    public static long getMinutesBetween(LocalDateTime start, LocalDateTime end) {
        return ChronoUnit.MINUTES.between(start, end);
    }

    /**
     * 두 LocalDateTime 사이의 시간 차이를 시간 단위(소수점 포함)로 계산
     */
    public static double getHoursBetween(LocalDateTime start, LocalDateTime end) {
        long minutes = getMinutesBetween(start, end);
        return minutes / 60.0;
    }

    /**
     * 날짜를 yyyy-MM-dd 형식의 문자열로 포맷팅
     */
    public static String formatDate(LocalDate date) {
        return date.format(DATE_FORMATTER);
    }

    /**
     * 날짜시간을 yyyy-MM-dd HH:mm:ss 형식의 문자열로 포맷팅
     */
    public static String formatDateTime(LocalDateTime dateTime) {
        return dateTime.format(DATE_TIME_FORMATTER);
    }

    /**
     * 시간을 HH:mm:ss 형식의 문자열로 포맷팅
     */
    public static String formatTime(LocalTime time) {
        return time.format(TIME_FORMATTER);
    }
}