package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 근로계약 기간 구분.
 *
 * <p>기간제는 종료일이 필수이고, 정함 없음은 종료일을 비워 둔다. 화면과 서류에서
 * 계약기간 유형을 명확히 표시하기 위한 값이다.
 */
@Getter
public enum ContractPeriodType {

    PERMANENT("기간의 정함 없음"),
    FIXED_TERM("기간제");

    private final String displayName;

    ContractPeriodType(String displayName) {
        this.displayName = displayName;
    }
}
