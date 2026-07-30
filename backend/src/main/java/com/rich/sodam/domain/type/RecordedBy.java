package com.rich.sodam.domain.type;

/**
 * 휴게 기록({@code BreakRecord})을 누가 남겼는지 구분 (L-NEW-04 확장).
 *
 * <p>MASTER: 사장이 사후에 부여를 증빙하는 기존 경로({@code BreakRecordCreateRequest}).
 * EMPLOYEE: 직원이 앱에서 실시간으로 휴게 시작/종료를 직접 기록하는 신규 경로.
 */
public enum RecordedBy {
    /** 사장이 사후 입력. */
    MASTER,
    /** 직원 본인이 실시간 기록. */
    EMPLOYEE
}
