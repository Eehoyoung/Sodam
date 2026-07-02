package com.rich.sodam.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 매장 통계 응답을 위한 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StoreStatsDto {
    private Long storeId;
    private String storeName;
    private int totalEmployees;
    private long totalLaborCost;
    private int averageHourlyWage;
    private int pendingTimeOffRequests;
    private String month;
}
