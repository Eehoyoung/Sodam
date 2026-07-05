package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.EmployeeWageUpdateDto;
import com.rich.sodam.dto.request.LocationUpdateDto;
import com.rich.sodam.dto.request.StoreRegistrationDto;
import com.rich.sodam.dto.request.StoreUpdateDto;

import java.util.List;

public interface StoreManagementService {

    Store registerStoreWithMaster(Long userId, StoreRegistrationDto storeDto);

    void assignUserToStoreAsEmployee(Long userId, Long storeId);

    List<Store> getStoresByMaster(Long userId);

    List<Store> getStoresByEmployee(Long userId);

    List<User> getEmployeesByStore(Long storeId);

    Store updateStoreLocation(Long storeId, LocationUpdateDto locationDto);

    /**
     * 직원 임금 설정 변경 — 시급/고용형태(월급제)/개인 4대보험.
     *
     * @param changedBy 변경 수행 사장 userId (고용형태 전환 이력 기록용)
     */
    void updateEmployeeWage(EmployeeWageUpdateDto wageDto, Long changedBy);

    void updateStoreStandardWage(Long storeId, Integer standardHourlyWage);

    Integer getEmployeeWageInStore(Long employeeId, Long storeId);

    // ===== RN 연동을 위한 일반 업데이트/삭제 =====
    Store updateStore(Long storeId, StoreUpdateDto updateDto);

    void deleteStore(Long storeId);

    /**
     * 직원 본인이 매장 코드로 가입 (PRD_EMPLOYEE E-301).
     * 시급은 매장 기본 시급 사용.
     */
    Store joinStoreByCode(Long userId, String storeCode);

    /** 사장 메모 갱신 (직원에게 노출 X). */
    void updateOwnerMemo(Long storeId, Long employeeId, String memo);

    /** 사장 메모 조회. */
    String getOwnerMemo(Long storeId, Long employeeId);

    /** 직원 활성/비활성 토글(퇴사·복직 처리). */
    void setEmployeeActive(Long storeId, Long employeeId, boolean active);

    /** 매장 운영시간(요일별) 조회. */
    com.rich.sodam.dto.response.OperatingHoursResponseDto getOperatingHours(Long storeId);

    /** 매장 운영시간(요일별) 수정. 출퇴근 누락 알림·운영시간 외 경고의 기준값. */
    com.rich.sodam.dto.response.OperatingHoursResponseDto updateOperatingHours(
            Long storeId, com.rich.sodam.dto.request.OperatingHoursUpdateDto dto);

    /** 매장 시급 변경 이력(기본/개별) 최신순. */
    java.util.List<com.rich.sodam.dto.response.WageHistoryDto> getStoreWageHistory(Long storeId);

    /**
     * 매장 정산주기를 실제 날짜로 해석한다 — 정산 마법사 기간 기본값·지급 예정일.
     *
     * @param month 기준월. null 이면 오늘이 속한 정산주기의 기준월을 자동 판정.
     */
    com.rich.sodam.dto.response.PayrollCyclePeriodDto resolvePayrollCyclePeriod(
            Long storeId, java.time.YearMonth month);
}



