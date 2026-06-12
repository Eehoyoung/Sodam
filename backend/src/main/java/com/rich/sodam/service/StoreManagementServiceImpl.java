package com.rich.sodam.service;

import com.rich.sodam.config.app.AppProperties;
import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.domain.*;
import com.rich.sodam.dto.request.EmployeeWageUpdateDto;
import com.rich.sodam.dto.request.LocationUpdateDto;
import com.rich.sodam.dto.request.StoreRegistrationDto;
import com.rich.sodam.dto.request.StoreUpdateDto;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
    private final AppProperties appProperties;
    private final WageHistoryRepository wageHistoryRepository;

    @NotNull
    private Store getStore(StoreRegistrationDto storeDto) {
        Store store = new Store(
                storeDto.getStoreName(),
                storeDto.getBusinessNumber(),
                storeDto.getStorePhoneNumber(),
                storeDto.getBusinessType(),
                storeDto.getStoreStandardHourWage(),
                appProperties.getStore().getDefaultRadius()
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

//        if (!validationService.validateFormat(storeDto.getBusinessNumber())) {
//            throw new IllegalArgumentException("사업자 등록번호 형식이 올바르지 않습니다.");
//        }
//
//        if (!validationService.validateWithTaxOffice(storeDto.getBusinessNumber())) {
//            throw new IllegalArgumentException("유효하지 않은 사업자 등록번호입니다.");
//        }
//
//        if (validationService.isDuplicate(storeDto.getBusinessNumber())) {
//            throw new IllegalArgumentException("이미 등록된 사업자 등록번호입니다.");
//        }

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

    /**
     * 매장 코드로 직원 본인이 가입 (PRD_EMPLOYEE E-301).
     * - storeCode 가 활성 매장과 일치해야 함
     * - 기존 동일 관계 비활성 상태면 재활성, 활성이면 그대로 반환
     * - 시급은 매장 기본 시급 사용
     */
    @Override
    @Transactional
    public Store joinStoreByCode(Long userId, String storeCode) {
        Store store = storeRepository.findActiveByStoreCode(storeCode)
                .orElseThrow(() -> new EntityNotFoundException("매장 코드와 일치하는 매장을 찾을 수 없습니다."));
        assignUserToStoreAsEmployee(userId, store.getId(), null);
        // 비활성 → 활성 복구
        EmployeeProfile profile = employeeProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("직원 프로필이 없습니다."));
        employeeStoreRelationRepository.findByEmployeeProfileAndStore(profile, store)
                .ifPresent(rel -> { if (Boolean.FALSE.equals(rel.getIsActive())) rel.setIsActive(true); });
        return store;
    }

    @Override
    @Transactional
    public void updateOwnerMemo(Long storeId, Long employeeId, String memo) {
        if (storeId == null || employeeId == null) {
            throw new IllegalArgumentException("storeId 와 employeeId 는 필수입니다.");
        }
        // 길이 검증을 사전에 수행 — 불필요한 DB I/O 방지
        if (memo != null && memo.length() > 500) {
            throw new IllegalArgumentException("메모는 500자 이내로 작성해 주세요.");
        }
        // ID 기반 직접 매핑 — @MapsId 사용 시 객체 기반 파생 쿼리에서 발생 가능한 매칭 오류 회피.
        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findRelation(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "직원-매장 관계를 찾을 수 없습니다. employeeId=" + employeeId + ", storeId=" + storeId));
        relation.setOwnerMemo(memo == null ? "" : memo);
        employeeStoreRelationRepository.save(relation);
    }

    @Override
    @Transactional(readOnly = true)
    public com.rich.sodam.dto.response.OperatingHoursResponseDto getOperatingHours(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다. ID: " + storeId));
        return com.rich.sodam.dto.response.OperatingHoursResponseDto.from(store);
    }

    @Override
    @Transactional
    public com.rich.sodam.dto.response.OperatingHoursResponseDto updateOperatingHours(
            Long storeId, com.rich.sodam.dto.request.OperatingHoursUpdateDto dto) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다. ID: " + storeId));
        com.rich.sodam.domain.OperatingHours oh = com.rich.sodam.domain.OperatingHours.createDefault();
        if (dto.getOperatingHours() != null) {
            for (com.rich.sodam.dto.request.OperatingHoursUpdateDto.DayOperatingHours d : dto.getOperatingHours()) {
                boolean closed = Boolean.TRUE.equals(d.getIsClosed());
                oh.setDayOperatingHours(d.getDayOfWeek(), d.getOpenTime(), d.getCloseTime(), closed);
            }
        }
        store.updateOperatingHours(oh);
        storeRepository.save(store);
        return com.rich.sodam.dto.response.OperatingHoursResponseDto.from(store);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<com.rich.sodam.dto.response.WageHistoryDto> getStoreWageHistory(Long storeId) {
        return wageHistoryRepository.findByStore_IdOrderByEffectiveFromDesc(storeId)
                .stream().map(com.rich.sodam.dto.response.WageHistoryDto::from).toList();
    }

    @Override
    @Transactional
    public void setEmployeeActive(Long storeId, Long employeeId, boolean active) {
        if (storeId == null || employeeId == null) {
            throw new IllegalArgumentException("storeId 와 employeeId 는 필수입니다.");
        }
        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findRelation(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "직원-매장 관계를 찾을 수 없습니다. employeeId=" + employeeId + ", storeId=" + storeId));
        relation.setIsActive(active);
        employeeStoreRelationRepository.save(relation);
    }

    @Override
    @Transactional(readOnly = true)
    public String getOwnerMemo(Long storeId, Long employeeId) {
        if (storeId == null || employeeId == null) {
            return "";
        }
        return employeeStoreRelationRepository.findRelation(employeeId, storeId)
                .map(EmployeeStoreRelation::getOwnerMemo)
                .orElse("");
    }

    /**
     * 설정하려는 시급이 당해 연도 최저임금 이상인지 검증한다(최저임금법 §6).
     *
     * <p>최저임금 미달 지급은 형사처벌(§28: 3년↓ 또는 2천만원↓) 대상이므로, 데이터 저장 시점에
     * 차단하여 사장이 위반 임금을 설정하지 못하게 한다. null(미설정)은 매장 기준시급으로 폴백되므로 통과시킨다.</p>
     */
    private void assertAtLeastMinimumWage(Integer hourlyWage) {
        if (hourlyWage == null) {
            return;
        }
        int year = LocalDate.now().getYear();
        if (!MinimumWage.isAtLeastMinimum(hourlyWage, year)) {
            throw new IllegalArgumentException(String.format(
                    "%d년 최저임금(%,d원) 미만으로는 시급을 설정할 수 없습니다. 입력값: %,d원",
                    year, MinimumWage.hourlyFor(year).intValue(), hourlyWage));
        }
    }

    @Transactional
    public void assignUserToStoreAsEmployee(Long userId, Long storeId, Integer customHourlyWage) {
        assertAtLeastMinimumWage(customHourlyWage);
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
    @CacheEvict(value = "stores", key = "'wage:' + #wageDto.employeeId + ':' + #wageDto.storeId")
    public void updateEmployeeWage(EmployeeWageUpdateDto wageDto) {
        EmployeeProfile employeeProfile = employeeProfileRepository.findById(wageDto.getEmployeeId())
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));

        Store store = storeRepository.findById(wageDto.getStoreId())
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException("사원-매장 관계를 찾을 수 없습니다."));

        assertAtLeastMinimumWage(wageDto.getCustomHourlyWage());

        // 시급 정보 업데이트
        Integer oldCustom = relation.getCustomHourlyWage();
        relation.setCustomHourlyWage(wageDto.getCustomHourlyWage());

        // 매장 기준 시급 사용 여부 설정
        if (wageDto.getUseStoreStandardWage() != null && wageDto.getUseStoreStandardWage()) {
            relation.useStoreStandardWage();
        } else {
            relation.useCustomWage();
        }

        employeeStoreRelationRepository.save(relation);

        // 변경 이력 기록 (개별 시급)
        if (wageDto.getCustomHourlyWage() != null
                && !wageDto.getCustomHourlyWage().equals(oldCustom)) {
            wageHistoryRepository.save(WageHistory.employeeOverride(
                    store, employeeProfile, wageDto.getCustomHourlyWage(),
                    null, "직원 개별 시급 변경"));
        }
    }

    @Override
    @Transactional
    public void updateStoreStandardWage(Long storeId, Integer standardHourlyWage) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        assertAtLeastMinimumWage(standardHourlyWage);

        Integer oldWage = store.getStoreStandardHourWage();
        store.setStoreStandardHourWage(standardHourlyWage);
        storeRepository.save(store);

        // 변경 이력 기록 (매장 기본 시급)
        if (standardHourlyWage != null && !standardHourlyWage.equals(oldWage)) {
            wageHistoryRepository.save(WageHistory.storeDefault(
                    store, standardHourlyWage, null, "매장 기본 시급 변경"));
        }
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "stores", key = "'wage:' + #employeeId + ':' + #storeId")
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
    @Cacheable(value = "stores", key = "'master:' + #userId")
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

    @Override
    @Transactional
    public Store updateStore(Long storeId, StoreUpdateDto updateDto) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        // 기본 정보 업데이트
        if (updateDto.getStoreName() != null || updateDto.getStorePhoneNumber() != null || updateDto.getBusinessType() != null) {
            store.updateStoreInfo(updateDto.getStoreName(), updateDto.getStorePhoneNumber(), updateDto.getBusinessType());
        }

        // 주소 정보 업데이트
        if (updateDto.getRoadAddress() != null || updateDto.getJibunAddress() != null) {
            store.setAddressDetails(updateDto.getRoadAddress(), updateDto.getJibunAddress());
        }
        if (updateDto.getFullAddress() != null) {
            store.setFullAddress(updateDto.getFullAddress());
        }

        // 반경/시급 정보 업데이트
        if (updateDto.getRadius() != null) {
            store.setRadius(updateDto.getRadius());
        }
        if (updateDto.getStoreStandardHourWage() != null) {
            store.setStoreStandardHourWage(updateDto.getStoreStandardHourWage());
        }

        return storeRepository.save(store);
    }

    @Override
    @Transactional
    public void deleteStore(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
        store.softDelete();
        storeRepository.save(store);
    }
}
