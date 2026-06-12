package com.rich.sodam.dto.response;

import com.rich.sodam.domain.type.InsuranceFilingType;

import java.time.LocalDate;
import java.util.List;

/**
 * 4대보험 신고서 서식(자동 채움 결과). 사장이 <b>직접 공단에 제출</b>하는 보조 자료.
 * 소담은 신고를 대행하지 않으며, 보험료는 공단이 최종 확정한다.
 *
 * @param fullResidentNumber 신고서 제출용 주민번호(요청값 그대로 echo — 서버 미저장)
 * @param maskedResidentNumber 화면/감사 표시용 마스킹 값
 * @param lines 보험별 근로자 부담 추정(참고용)
 */
public record InsuranceFilingForm(
        String employeeName,
        String fullResidentNumber,
        String maskedResidentNumber,
        InsuranceFilingType filingType,
        String filingTypeName,
        LocalDate effectiveDate,
        int monthlyWage,
        List<InsuranceLine> lines,
        String disclaimer
) {
    public record InsuranceLine(String insurance, int employeeShareEstimate, String note) {
    }
}
