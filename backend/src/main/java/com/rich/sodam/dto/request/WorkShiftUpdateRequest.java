package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 근무 시프트 수정 요청 (B10/E-NEW-05). 사장 전용.
 *
 * <p>직원 재배정은 지원하지 않는다(삭제 후 재등록). 날짜·시각·메모만 변경.
 * 종료시각이 시작시각보다 빠르면 익일 종료(야간 근무)로 해석한다.
 */
@Getter
@Setter
public class WorkShiftUpdateRequest {

    @NotNull(message = "근무 날짜를 입력해 주세요.")
    private LocalDate shiftDate;

    @NotNull(message = "시작 시간을 입력해 주세요.")
    private LocalTime startTime;

    @NotNull(message = "종료 시간을 입력해 주세요.")
    private LocalTime endTime;

    private String memo;

    /**
     * 클라이언트가 마지막으로 읽은 낙관적 락 버전(선택). 웹 콘솔·모바일 앱이 같은 시프트를
     * 동시에 수정할 때의 lost update 감지용(05_동시성제어_및_고급아키텍처.md §2).
     *
     * <p>이 값이 없으면(구버전 클라이언트 호환) 검증을 생략한다 — 서비스가 수정 직전에
     * 시프트를 비관적 락(PESSIMISTIC_WRITE)으로 재조회하므로, 클라이언트가 버전을 명시적으로
     * 보내지 않으면 항상 최신 버전을 그대로 읽어 Hibernate 표준 낙관적 락이 자연히 발동하지
     * 않는다 — 그래서 서비스 레이어에서 이 값을 명시적으로 비교한다.
     */
    private Long version;
}
