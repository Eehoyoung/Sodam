package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.dto.LocationUpdateDto;
import com.rich.sodam.dto.StoreRegistrationDto;
import com.rich.sodam.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoreManagementServiceImpl implements StoreManagementService {

    private final UserRepository userRepository;
    private final MasterProfileRepository masterProfileRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final StoreRepository storeRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;


    @Override
    @Transactional
    public Store registerStoreWithMaster(Long userId, StoreRegistrationDto storeDto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        // 사용자를 MASTER로 변경
        user.changeToMaster();

        // MasterProfile 생성 또는 조회
        MasterProfile masterProfile;
        Optional<MasterProfile> masterProfileOptional = masterProfileRepository.findById(userId);

        if (masterProfileOptional.isPresent()) {
            masterProfile = masterProfileOptional.get();
        } else {
            masterProfile = new MasterProfile(user, storeDto.getBusinessLicenseNumber());
            masterProfileRepository.save(masterProfile);
        }

        // 매장 생성
        Store store = new Store(
                storeDto.getStoreName(),
                storeDto.getBusinessNumber(),
                storeDto.getStorePhoneNumber(),
                storeDto.getBusinessType()
        );

        // 위치 정보 설정
        if (storeDto.getLatitude() != null && storeDto.getLongitude() != null) {
            store.setLatitude(storeDto.getLatitude());
            store.setLongitude(storeDto.getLongitude());
        }

        if (storeDto.getFullAddress() != null) {
            store.setFullAddress(storeDto.getFullAddress());
        }

        if (storeDto.getRoadAddress() != null) {
            store.setRoadAddress(storeDto.getRoadAddress());
        }

        if (storeDto.getJibunAddress() != null) {
            store.setJibunAddress(storeDto.getJibunAddress());
        }

        if (storeDto.getRadius() != null) {
            store.setRadius(storeDto.getRadius());
        }

        storeRepository.save(store);

        // 사장-매장 관계 생성
        MasterStoreRelation relation = new MasterStoreRelation(masterProfile, store);
        masterStoreRelationRepository.save(relation);

        return store;
    }

    @Override
    @Transactional
    public void assignUserToStoreAsEmployee(Long userId, Long storeId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        // 사용자를 EMPLOYEE로 변경
        user.changeToEmployee();

        // EmployeeProfile 생성 또는 조회
        EmployeeProfile employeeProfile;
        Optional<EmployeeProfile> employeeProfileOptional = employeeProfileRepository.findById(userId);

        if (employeeProfileOptional.isPresent()) {
            employeeProfile = employeeProfileOptional.get();
        } else {
            employeeProfile = new EmployeeProfile(user);
            employeeProfileRepository.save(employeeProfile);
        }

        // 사원-매장 관계 생성
        EmployeeStoreRelation relation = new EmployeeStoreRelation(employeeProfile, store);
        employeeStoreRelationRepository.save(relation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Store> getStoresByMaster(Long userId) {
        MasterProfile masterProfile = masterProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사장 프로필을 찾을 수 없습니다."));

        return masterStoreRelationRepository.findByMasterProfile(masterProfile)
                .stream()
                .map(MasterStoreRelation::getStore)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Store> getStoresByEmployee(Long userId) {
        EmployeeProfile employeeProfile = employeeProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));

        return employeeStoreRelationRepository.findByEmployeeProfile(employeeProfile)
                .stream()
                .map(EmployeeStoreRelation::getStore)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> getEmployeesByStore(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        return employeeStoreRelationRepository.findByStore(store)
                .stream()
                .map(relation -> relation.getEmployeeProfile().getUser())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Store updateStoreLocation(Long storeId, LocationUpdateDto locationDto) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        // 좌표 정보 업데이트
        if (locationDto.getLatitude() != null && locationDto.getLongitude() != null) {
            store.setLatitude(locationDto.getLatitude());
            store.setLongitude(locationDto.getLongitude());
        }

        // 반경 정보 업데이트
        if (locationDto.getRadius() != null) {
            store.setRadius(locationDto.getRadius());
        }

        // 주소 정보 업데이트
        if (locationDto.getFullAddress() != null) {
            store.setFullAddress(locationDto.getFullAddress());
        }

        return storeRepository.save(store);
    }
}