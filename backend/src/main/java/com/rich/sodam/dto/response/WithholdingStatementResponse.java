package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 간이지급명세서 자료 (A2/T-NEW-01) — 인별 연간 지급액·원천징수세액 집계.
 *
 * <p>합법 라인: <b>자료정리까지만</b>. 신고·제출은 홈택스 외부링크로 위임(대행 아님).
 * 주민번호 미저장 — 이름+내부ID까지만, 주민번호는 사장이 홈택스에서 보완.
 *
 * @param storeId       매장 id
 * @param year          귀속 연도
 * @param employeeCount 대상 인원
 * @param totalPaid     지급총액 합
 * @param totalWithheld 원천징수세액 합
 * @param items         인별 라인
 * @param disclaimer    면책(참고용·세무사 검토 전)
 */
public record WithholdingStatementResponse(
        Long storeId,
        int year,
        int employeeCount,
        long totalPaid,
        long totalWithheld,
        List<EmployeeLine> items,
        String disclaimer
) {
    public record EmployeeLine(Long employeeId, String employeeName, long paidTotal, long withheldTotal) {
    }
}
