package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PayrollCycle;
import com.rich.sodam.domain.Store;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 매장 응답 DTO (WP-09 1단계 — Controller/DTO 경계 정리).
 *
 * <p>이전에는 {@code StoreController}/{@code StoreQueryController}/{@code MasterController} 의
 * 11개 엔드포인트가 {@link Store} 엔티티를 그대로 직렬화해 반환했다. 이 때문에 Jackson이
 * {@code isActive()}/{@code isDeleted()}/{@code isPremiumApplicable()}/{@code isOpenNow()}/
 * {@code isFullyConfigured()} boolean getter를 {@code active}/{@code deleted}/
 * {@code premiumApplicable}/{@code openNow}/{@code fullyConfigured} 필드로 자동 노출했는데,
 * FE 전수 추적 결과 이 5개 필드는 어디에서도 소비되지 않는다 — 신규 DTO에서 의도적으로 제외한다.</p>
 *
 * <p>필드 목록은 FE가 실제로 읽는 필드(§4/§6 조사)의 합집합이다.</p>
 */
@Getter
public class StoreResponseDto {

    private final Long id;
    private final String storeName;
    private final String businessNumber;
    private final String storePhoneNumber;
    private final String businessType;
    private final String storeCode;
    private final String fullAddress;
    private final Double latitude;
    private final Double longitude;
    private final Integer radius;
    private final Integer storeStandardHourWage;
    private final Integer employeeCount;
    private final String taxAccountantEmail;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final PayrollCycle payrollCycle;
    private final Long monthlyLaborCost;
    private final Integer todayAttendance;
    private final Long monthlyRevenue;

    private StoreResponseDto(Store store) {
        this.id = store.getId();
        this.storeName = store.getStoreName();
        this.businessNumber = store.getBusinessNumber();
        this.storePhoneNumber = store.getStorePhoneNumber();
        this.businessType = store.getBusinessType();
        this.storeCode = store.getStoreCode();
        this.fullAddress = store.getFullAddress();
        this.latitude = store.getLatitude();
        this.longitude = store.getLongitude();
        this.radius = store.getRadius();
        this.storeStandardHourWage = store.getStoreStandardHourWage();
        this.employeeCount = store.getEmployeeCount();
        this.taxAccountantEmail = store.getTaxAccountantEmail();
        this.createdAt = store.getCreatedAt();
        this.updatedAt = store.getUpdatedAt();
        this.payrollCycle = store.getPayrollCycle();
        this.monthlyLaborCost = store.getMonthlyLaborCost();
        this.todayAttendance = store.getTodayAttendance();
        this.monthlyRevenue = store.getMonthlyRevenue();
    }

    public static StoreResponseDto from(Store store) {
        return new StoreResponseDto(store);
    }
}
