package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.StoreRegistrationDto;

import java.util.List;

public interface StoreManagementService {

    Store registerStoreWithMaster(Long userId, StoreRegistrationDto storeDto
    );

    void assignUserToStoreAsEmployee(Long userId, Long storeId);

    List<Store> getStoresByMaster(Long userId);

    List<Store> getStoresByEmployee(Long userId);

    List<User> getEmployeesByStore(Long storeId);

}

