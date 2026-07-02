package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.InsuranceFilingType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 4대보험 신고서 생성 요청.
 *
 * <p>⚠️ {@code residentNumber} 는 신고서 서식 채움에만 쓰이고 <b>절대 저장·로그하지 않는다</b>
 * (개인정보보호법·프로젝트 운영 기준 Hard-No). 응답 서식에 담겨 사장에게 반환된 뒤 서버 메모리에서 폐기된다.</p>
 */
@Getter
@Setter
@NoArgsConstructor
public class InsuranceFilingRequest {

    @NotNull(message = "직원을 선택해 주세요.")
    private Long employeeId;

    /** 주민등록번호 — 미저장·미로그. 신고서 출력에만 사용. */
    @NotBlank(message = "주민등록번호가 필요합니다.")
    private String residentNumber;

    @NotNull(message = "신고 유형이 필요합니다.")
    private InsuranceFilingType filingType;

    @Positive(message = "월 보수액이 올바르지 않습니다.")
    private int monthlyWage;

    @NotNull(message = "기준일(취득/상실/기준월)이 필요합니다.")
    private LocalDate effectiveDate;
}
