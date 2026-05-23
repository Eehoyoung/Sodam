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

    void updateEmployeeWage(EmployeeWageUpdateDto wageDto);

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
}



