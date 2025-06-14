package com.rich.sodam.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사장이 소유한 모든 매장의 통합 통계 응답을 위한 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CombinedStatsDto {
    private int totalStores;
    private int totalEmployees;
    private long totalLaborCost;
    private int pendingTimeOffRequests;
}
