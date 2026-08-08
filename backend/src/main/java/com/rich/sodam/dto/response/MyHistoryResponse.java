package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 본인 근무 이력 응답(WP-H 데이터 연속성).
 *
 * <p>⚠️ 엔티티를 직접 반환하지 않고 필요한 필드만 골라 담는다 — 출퇴근·계약 엔티티에는 GPS 좌표,
 * 타 직원 정보로 이어지는 연관관계 등 응답에 나가면 안 되는 것이 딸려 있다.
 * 특히 <b>좌표는 어떤 필드로도 노출하지 않는다</b>(security.md PII 규칙).</p>
 */
public final class MyHistoryResponse {

    private MyHistoryResponse() {
    }

    /**
     * 출퇴근 1건. 퇴사한 매장의 기록도 포함되므로 매장명을 함께 담는다
     * (사용자는 자기가 어느 매장 id에서 일했는지 모른다).
     */
    public record AttendanceItem(
            Long id,
            String storeName,
            LocalDate workDate,
            LocalDateTime checkInTime,
            LocalDateTime checkOutTime,
            long workingMinutes,
            Integer appliedHourlyWage) {
    }

    /** 근로계약 1건. 금액은 본인 것이므로 노출해도 되지만, 서명 원본·상대방 정보는 담지 않는다. */
    public record ContractItem(
            Long id,
            Long storeId,
            LocalDate startDate,
            LocalDate endDate,
            String payType,
            Integer hourlyWage,
            Integer monthlyBaseSalary,
            LocalDateTime createdAt) {
    }

    /** 페이지 응답 — 무한 스크롤용 최소 메타만. */
    public record Page<T>(
            List<T> items,
            int page,
            int size,
            long totalElements,
            boolean hasNext) {
    }
}
