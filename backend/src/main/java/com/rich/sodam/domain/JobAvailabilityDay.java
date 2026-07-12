package com.rich.sodam.domain;

import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * 인증채용 구직 프로필의 요일별 근무 가능 시간 1건 — 순수 값 객체(260711_작업통합.md Part 2 §3.1).
 *
 * <p>{@code JobSeekingProfile.availability}(컬럼: {@code availability_json})가 이 레코드의 리스트를
 * {@link com.rich.sodam.config.converter.JobAvailabilityListConverter}로 직렬화해 보관한다. 요일당
 * 최대 1항목, v1은 야간(종료 ≤ 시작) 시간대를 허용하지 않는다 — 구조 검증은 서비스 레이어 책임이며
 * 여기는 순수 데이터 보관 용도다(WorkScheduleDay·WorkScheduleListConverter와 동일한 역할 분리).</p>
 *
 * @param day       근무 가능 요일
 * @param startTime 시작 시각
 * @param endTime   종료 시각(v1: startTime보다 늦어야 함 — 검증은 서비스에서)
 */
public record JobAvailabilityDay(
        DayOfWeek day,
        LocalTime startTime,
        LocalTime endTime
) {
}
