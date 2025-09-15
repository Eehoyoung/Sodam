package com.rich.sodam.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 매장 삭제 정보 응답 DTO
 * 매장 삭제 전에 삭제 가능 여부와 관련 데이터 정보를 제공합니다.
 */
@Data
@Builder
@Schema(description = "매장 삭제 정보 응답")
public class StoreDeletionInfoDto {

    @Schema(description = "매장 ID", example = "1")
    private Long storeId;

    @Schema(description = "매장명", example = "소담 카페")
    private String storeName;

    @Schema(description = "매장 코드", example = "ST1234567890_ABCD1234")
    private String storeCode;

    @Schema(description = "삭제 가능 여부", example = "false")
    private Boolean canDelete;

    @Schema(description = "삭제 불가능한 이유", example = "활성 직원이 3명 존재합니다.")
    private String reason;

    @Schema(description = "경고 메시지 목록")
    private List<String> warnings;

    @Schema(description = "활성 직원 수", example = "3")
    private Integer activeEmployeeCount;

    @Schema(description = "출근 기록 수", example = "150")
    private Integer attendanceRecordCount;

    @Schema(description = "급여 기록 수", example = "45")
    private Integer payrollRecordCount;

    @Schema(description = "미지급 급여 건수", example = "2")
    private Integer unpaidPayrollCount;

    @Schema(description = "마지막 활동 일시", example = "2025-08-05T14:30:00")
    private LocalDateTime lastActivityDate;

    @Schema(description = "매장 생성일", example = "2025-01-15T09:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "관련 데이터 상세 정보")
    private RelatedDataInfo relatedDataInfo;

    /**
     * 삭제 가능한 매장 정보 생성
     *
     * @param storeId   매장 ID
     * @param storeName 매장명
     * @param storeCode 매장 코드
     * @param createdAt 생성일
     * @return StoreDeletionInfoDto
     */
    public static StoreDeletionInfoDto createDeletableStore(Long storeId, String storeName,
                                                            String storeCode, LocalDateTime createdAt) {
        return StoreDeletionInfoDto.builder()
                .storeId(storeId)
                .storeName(storeName)
                .storeCode(storeCode)
                .canDelete(true)
                .reason(null)
                .warnings(List.of("매장 삭제 시 모든 관련 데이터가 복구 불가능하게 처리됩니다."))
                .activeEmployeeCount(0)
                .attendanceRecordCount(0)
                .payrollRecordCount(0)
                .unpaidPayrollCount(0)
                .lastActivityDate(null)
                .createdAt(createdAt)
                .relatedDataInfo(RelatedDataInfo.builder()
                        .activeEmployees(List.of())
                        .recentAttendances(List.of())
                        .unpaidPayrolls(List.of())
                        .build())
                .build();
    }

    /**
     * 삭제 불가능한 매장 정보 생성
     *
     * @param storeId               매장 ID
     * @param storeName             매장명
     * @param storeCode             매장 코드
     * @param reason                삭제 불가능한 이유
     * @param activeEmployeeCount   활성 직원 수
     * @param attendanceRecordCount 출근 기록 수
     * @param payrollRecordCount    급여 기록 수
     * @param unpaidPayrollCount    미지급 급여 건수
     * @param lastActivityDate      마지막 활동 일시
     * @param createdAt             생성일
     * @return StoreDeletionInfoDto
     */
    public static StoreDeletionInfoDto createNonDeletableStore(Long storeId, String storeName, String storeCode,
                                                               String reason, Integer activeEmployeeCount,
                                                               Integer attendanceRecordCount, Integer payrollRecordCount,
                                                               Integer unpaidPayrollCount, LocalDateTime lastActivityDate,
                                                               LocalDateTime createdAt) {
        List<String> warnings = List.of(
                "활성 직원이 존재하는 매장은 삭제할 수 없습니다.",
                "모든 직원을 퇴사 처리한 후 삭제를 시도해주세요.",
                "강제 삭제 옵션을 사용할 경우 모든 관련 데이터가 삭제됩니다."
        );

        return StoreDeletionInfoDto.builder()
                .storeId(storeId)
                .storeName(storeName)
                .storeCode(storeCode)
                .canDelete(false)
                .reason(reason)
                .warnings(warnings)
                .activeEmployeeCount(activeEmployeeCount)
                .attendanceRecordCount(attendanceRecordCount)
                .payrollRecordCount(payrollRecordCount)
                .unpaidPayrollCount(unpaidPayrollCount)
                .lastActivityDate(lastActivityDate)
                .createdAt(createdAt)
                .relatedDataInfo(null) // 상세 정보는 별도 설정
                .build();
    }

    /**
     * 삭제 위험도 레벨 반환
     *
     * @return 위험도 레벨 (LOW, MEDIUM, HIGH)
     */
    public String getDeletionRiskLevel() {
        if (Boolean.TRUE.equals(canDelete)) {
            return "LOW";
        }

        if (activeEmployeeCount > 0 || unpaidPayrollCount > 0) {
            return "HIGH";
        }

        if (attendanceRecordCount > 100 || payrollRecordCount > 50) {
            return "MEDIUM";
        }

        return "LOW";
    }

    /**
     * 삭제 영향도 요약 문자열 반환
     *
     * @return 영향도 요약
     */
    public String getDeletionImpactSummary() {
        if (Boolean.TRUE.equals(canDelete)) {
            return "삭제 가능 - 영향 없음";
        }

        StringBuilder summary = new StringBuilder();
        summary.append("삭제 불가 - ");

        if (activeEmployeeCount > 0) {
            summary.append(String.format("활성 직원 %d명, ", activeEmployeeCount));
        }

        if (unpaidPayrollCount > 0) {
            summary.append(String.format("미지급 급여 %d건, ", unpaidPayrollCount));
        }

        if (attendanceRecordCount > 0) {
            summary.append(String.format("출근 기록 %d건, ", attendanceRecordCount));
        }

        if (payrollRecordCount > 0) {
            summary.append(String.format("급여 기록 %d건", payrollRecordCount));
        }

        // 마지막 쉼표 제거
        String result = summary.toString();
        if (result.endsWith(", ")) {
            result = result.substring(0, result.length() - 2);
        }

        return result;
    }

    /**
     * 관련 데이터 상세 정보
     */
    @Data
    @Builder
    @Schema(description = "관련 데이터 상세 정보")
    public static class RelatedDataInfo {

        @Schema(description = "활성 직원 목록")
        private List<ActiveEmployeeInfo> activeEmployees;

        @Schema(description = "최근 출근 기록 (최대 5개)")
        private List<RecentAttendanceInfo> recentAttendances;

        @Schema(description = "미지급 급여 목록")
        private List<UnpaidPayrollInfo> unpaidPayrolls;
    }

    /**
     * 활성 직원 정보
     */
    @Data
    @Builder
    @Schema(description = "활성 직원 정보")
    public static class ActiveEmployeeInfo {

        @Schema(description = "직원 ID", example = "10")
        private Long employeeId;

        @Schema(description = "직원명", example = "김직원")
        private String employeeName;

        @Schema(description = "이메일", example = "employee@example.com")
        private String email;

        @Schema(description = "시급", example = "12000")
        private Integer hourlyWage;

        @Schema(description = "입사일", example = "2025-03-01T00:00:00")
        private LocalDateTime joinedAt;

        @Schema(description = "마지막 출근일", example = "2025-08-04T09:00:00")
        private LocalDateTime lastAttendanceDate;
    }

    /**
     * 최근 출근 기록 정보
     */
    @Data
    @Builder
    @Schema(description = "최근 출근 기록 정보")
    public static class RecentAttendanceInfo {

        @Schema(description = "출근 기록 ID", example = "100")
        private Long attendanceId;

        @Schema(description = "직원명", example = "김직원")
        private String employeeName;

        @Schema(description = "출근 일자", example = "2025-08-04")
        private String attendanceDate;

        @Schema(description = "출근 시간", example = "09:00")
        private String checkInTime;

        @Schema(description = "퇴근 시간", example = "18:00")
        private String checkOutTime;

        @Schema(description = "근무 시간 (분)", example = "540")
        private Integer workingMinutes;
    }

    /**
     * 미지급 급여 정보
     */
    @Data
    @Builder
    @Schema(description = "미지급 급여 정보")
    public static class UnpaidPayrollInfo {

        @Schema(description = "급여 ID", example = "50")
        private Long payrollId;

        @Schema(description = "직원명", example = "김직원")
        private String employeeName;

        @Schema(description = "급여 기간", example = "2025년 7월")
        private String payrollPeriod;

        @Schema(description = "급여 금액", example = "1500000")
        private Integer totalAmount;

        @Schema(description = "급여 상태", example = "CALCULATED")
        private String payrollStatus;
    }
}
