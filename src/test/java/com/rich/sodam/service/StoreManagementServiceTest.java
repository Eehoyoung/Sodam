package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.dto.StoreRegistrationDto;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoreManagementServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private MasterProfileRepository masterProfileRepository;
    @Mock
    private EmployeeProfileRepository employeeProfileRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private MasterStoreRelationRepository masterStoreRelationRepository;
    @Mock
    private EmployeeStoreRelationRepository employeeStoreRelationRepository;

    @InjectMocks
    private StoreManagementServiceImpl storeManagementService; // 인터페이스가 아닌 구현체로 변경

    private User user;
    private Store store;
    private MasterProfile masterProfile;
    private EmployeeProfile employeeProfile;
    private StoreRegistrationDto storeRegistrationDto;

    @BeforeEach
    void setUp() {
        // 기본 테스트 데이터 설정
        user = new User("test@example.com", "Test User");
        user.setId(1L);

        store = new Store("Test Store", "123-45-67890", "02-1234-5678", "Cafe");
        store.setId(1L);

        masterProfile = new MasterProfile(user, "BL12345");

        employeeProfile = new EmployeeProfile(user);

        storeRegistrationDto = new StoreRegistrationDto();
        storeRegistrationDto.setStoreName("Test Store");
        storeRegistrationDto.setBusinessNumber("123-45-67890");
        storeRegistrationDto.setStorePhoneNumber("02-1234-5678");
        storeRegistrationDto.setBusinessType("Cafe");
        storeRegistrationDto.setBusinessLicenseNumber("BL12345");
    }


    @Test
    @DisplayName("일반 사용자를 사장으로 변환하고 매장 등록")
    void registerStoreWithMaster_NormalUser_Success() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(masterProfileRepository.findById(1L)).thenReturn(Optional.empty());
        when(masterProfileRepository.save(any(MasterProfile.class))).thenReturn(masterProfile);
        when(storeRepository.save(any(Store.class))).thenReturn(store);

        // When
        Store result = storeManagementService.registerStoreWithMaster(1L, storeRegistrationDto);

        // Then
        assertNotNull(result);
        assertEquals("Test Store", result.getStoreName());
        assertEquals(UserGrade.MASTER, user.getUserGrade());

        verify(userRepository).findById(1L);
        verify(masterProfileRepository).findById(1L);
        verify(masterProfileRepository).save(any(MasterProfile.class));
        verify(storeRepository).save(any(Store.class));
        verify(masterStoreRelationRepository).save(any(MasterStoreRelation.class));
    }

    @Test
    @DisplayName("이미 사장인 사용자가 매장 등록")
    void registerStoreWithMaster_AlreadyMaster_Success() {
        // Given
        user.setUserGrade(UserGrade.MASTER);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(masterProfileRepository.findById(1L)).thenReturn(Optional.of(masterProfile));
        when(storeRepository.save(any(Store.class))).thenReturn(store);

        // When
        Store result = storeManagementService.registerStoreWithMaster(1L, storeRegistrationDto);

        // Then
        assertNotNull(result);
        assertEquals("Test Store", result.getStoreName());
        assertEquals(UserGrade.MASTER, user.getUserGrade());

        verify(userRepository).findById(1L);
        verify(masterProfileRepository).findById(1L);
        verify(masterProfileRepository, never()).save(any(MasterProfile.class));
        verify(storeRepository).save(any(Store.class));
        verify(masterStoreRelationRepository).save(any(MasterStoreRelation.class));
    }

    @Test
    @DisplayName("사용자를 찾을 수 없는 경우 예외 발생")
    void registerStoreWithMaster_UserNotFound_ThrowsException() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(EntityNotFoundException.class, () -> storeManagementService.registerStoreWithMaster(1L, storeRegistrationDto));

        verify(userRepository).findById(1L);
        verify(masterProfileRepository, never()).findById(anyLong());
        verify(masterProfileRepository, never()).save(any(MasterProfile.class));
        verify(storeRepository, never()).save(any(Store.class));
    }

    @Test
    @DisplayName("일반 사용자를 사원으로 변환하고 매장에 할당")
    void assignUserToStoreAsEmployee_NormalUser_Success() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(employeeProfileRepository.findById(1L)).thenReturn(Optional.empty());
        when(employeeProfileRepository.save(any(EmployeeProfile.class))).thenReturn(employeeProfile);

        // When
        storeManagementService.assignUserToStoreAsEmployee(1L, 1L);

        // Then
        assertEquals(UserGrade.EMPLOYEE, user.getUserGrade());

        verify(userRepository).findById(1L);
        verify(storeRepository).findById(1L);
        verify(employeeProfileRepository).findById(1L);
        verify(employeeProfileRepository).save(any(EmployeeProfile.class));
        verify(employeeStoreRelationRepository).save(any(EmployeeStoreRelation.class));
    }

    @Test
    @DisplayName("이미 사원인 사용자가 매장에 할당")
    void assignUserToStoreAsEmployee_AlreadyEmployee_Success() {
        // Given
        user.setUserGrade(UserGrade.EMPLOYEE);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(employeeProfileRepository.findById(1L)).thenReturn(Optional.of(employeeProfile));

        // When
        storeManagementService.assignUserToStoreAsEmployee(1L, 1L);

        // Then
        assertEquals(UserGrade.EMPLOYEE, user.getUserGrade());

        verify(userRepository).findById(1L);
        verify(storeRepository).findById(1L);
        verify(employeeProfileRepository).findById(1L);
        verify(employeeProfileRepository, never()).save(any(EmployeeProfile.class));
        verify(employeeStoreRelationRepository).save(any(EmployeeStoreRelation.class));
    }

    @Test
    @DisplayName("사장이 관리하는 매장 목록 조회")
    void getStoresByMaster_Success() {
        // Given
        MasterStoreRelation relation1 = new MasterStoreRelation(masterProfile, store);
        Store store2 = new Store("Second Store", "987-65-43210", "02-9876-5432", "Restaurant");
        store2.setId(2L);
        MasterStoreRelation relation2 = new MasterStoreRelation(masterProfile, store2);

        when(masterProfileRepository.findById(1L)).thenReturn(Optional.of(masterProfile));
        when(masterStoreRelationRepository.findByMasterProfile(masterProfile))
                .thenReturn(Arrays.asList(relation1, relation2));

        // When
        List<Store> stores = storeManagementService.getStoresByMaster(1L);

        // Then
        assertNotNull(stores);
        assertEquals(2, stores.size());

        verify(masterProfileRepository).findById(1L);
        verify(masterStoreRelationRepository).findByMasterProfile(masterProfile);
    }

    @Test
    @DisplayName("사원이 소속된 매장 목록 조회")
    void getStoresByEmployee_Success() {
        // Given
        EmployeeStoreRelation relation1 = new EmployeeStoreRelation(employeeProfile, store);
        Store store2 = new Store("Second Store", "987-65-43210", "02-9876-5432", "Restaurant");
        store2.setId(2L);
        EmployeeStoreRelation relation2 = new EmployeeStoreRelation(employeeProfile, store2);

        when(employeeProfileRepository.findById(1L)).thenReturn(Optional.of(employeeProfile));
        when(employeeStoreRelationRepository.findByEmployeeProfile(employeeProfile))
                .thenReturn(Arrays.asList(relation1, relation2));

        // When
        List<Store> stores = storeManagementService.getStoresByEmployee(1L);

        // Then
        assertNotNull(stores);
        assertEquals(2, stores.size());

        verify(employeeProfileRepository).findById(1L);
        verify(employeeStoreRelationRepository).findByEmployeeProfile(employeeProfile);
    }

    @Test
    @DisplayName("매장에 소속된 사원 목록 조회")
    void getEmployeesByStore_Success() {
        // Given
        User user2 = new User("employee2@example.com", "Employee 2");
        user2.setId(2L);
        EmployeeProfile employeeProfile2 = new EmployeeProfile(user2);

        EmployeeStoreRelation relation1 = new EmployeeStoreRelation(employeeProfile, store);
        EmployeeStoreRelation relation2 = new EmployeeStoreRelation(employeeProfile2, store);

        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(employeeStoreRelationRepository.findByStore(store))
                .thenReturn(Arrays.asList(relation1, relation2));

        // When
        List<User> employees = storeManagementService.getEmployeesByStore(1L);

        // Then
        assertNotNull(employees);
        assertEquals(2, employees.size());

        verify(storeRepository).findById(1L);
        verify(employeeStoreRelationRepository).findByStore(store);
    }
}