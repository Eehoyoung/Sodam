package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.dto.request.EmployeeWageUpdateDto;
import com.rich.sodam.dto.request.LocationUpdateDto;
import com.rich.sodam.dto.request.StoreRegistrationDto;
import com.rich.sodam.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
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
    private final ValidationService validateFormat;
    private final ValidationService validationService;

    @NotNull
    private static Store getStore(StoreRegistrationDto storeDto) {
        Store store = new Store(
                storeDto.getStoreName(),
                storeDto.getBusinessNumber(),
                storeDto.getStorePhoneNumber(),
                storeDto.getBusinessType(),
                storeDto.getStoreStandardHourWage()
        );

        // 위치 정보 설정
        if (storeDto.getLatitude() != null && storeDto.getLongitude() != null) {
            store.setLatitude(storeDto.getLatitude());
            store.setLongitude(storeDto.getLongitude());
        }

        if (storeDto.getQuery() != null) {
            store.setFullAddress(storeDto.getQuery());
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
        return store;
    }

    @Override
    @Transactional
    public Store registerStoreWithMaster(Long userId, StoreRegistrationDto storeDto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        if (!validationService.validateFormat(storeDto.getBusinessNumber())) {
            throw new IllegalArgumentException("사업자 등록번호 형식이 올바르지 않습니다.");
        }

        if (!validationService.validateWithTaxOffice(storeDto.getBusinessNumber())) {
            throw new IllegalArgumentException("유효하지 않은 사업자 등록번호입니다.");
        }

        if (validationService.isDuplicate(storeDto.getBusinessNumber())) {
            throw new IllegalArgumentException("이미 등록된 사업자 등록번호입니다.");
        }

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
        Store store = getStore(storeDto);

        storeRepository.save(store);

        // 사장-매장 관계 생성
        MasterStoreRelation relation = new MasterStoreRelation(masterProfile, store);
        masterStoreRelationRepository.save(relation);

        return store;
    }

    @Override
    @Transactional
    public void assignUserToStoreAsEmployee(Long userId, Long storeId) {
        this.assignUserToStoreAsEmployee(userId, storeId, null);
    }

    @Transactional
    public void assignUserToStoreAsEmployee(Long userId, Long storeId, Integer customHourlyWage) {
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

        // 이미 관계가 있는지 확인
        Optional<EmployeeStoreRelation> existingRelation =
                employeeStoreRelationRepository.findByEmployeeProfileAndStore(employeeProfile, store);

        EmployeeStoreRelation relation;
        if (existingRelation.isPresent()) {
            // 이미 관계가 있으면 시급 정보만 업데이트
            relation = existingRelation.get();
            if (customHourlyWage != null) {
                relation.setCustomHourlyWage(customHourlyWage);
                relation.useCustomWage();
            }
        } else {
            // 새 관계 생성
            relation = new EmployeeStoreRelation(employeeProfile, store, customHourlyWage);
        }
        employeeStoreRelationRepository.save(relation);
    }

    @Override
    @Transactional
    public void updateEmployeeWage(EmployeeWageUpdateDto wageDto) {
        EmployeeProfile employeeProfile = employeeProfileRepository.findById(wageDto.getEmployeeId())
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));

        Store store = storeRepository.findById(wageDto.getStoreId())
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException("사원-매장 관계를 찾을 수 없습니다."));

        // 시급 정보 업데이트
        relation.setCustomHourlyWage(wageDto.getCustomHourlyWage());

        // 매장 기준 시급 사용 여부 설정
        if (wageDto.getUseStoreStandardWage() != null && wageDto.getUseStoreStandardWage()) {
            relation.useStoreStandardWage();
        } else {
            relation.useCustomWage();
        }

        employeeStoreRelationRepository.save(relation);
    }

    @Override
    @Transactional
    public void updateStoreStandardWage(Long storeId, Integer standardHourlyWage) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        store.setStoreStandardHourWage(standardHourlyWage);
        storeRepository.save(store);
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getEmployeeWageInStore(Long employeeId, Long storeId) {
        EmployeeProfile employeeProfile = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException("사원-매장 관계를 찾을 수 없습니다."));

        return relation.getAppliedHourlyWage();
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
