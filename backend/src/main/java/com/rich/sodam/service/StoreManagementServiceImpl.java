package com.rich.sodam.service;

import com.rich.sodam.config.app.AppProperties;
import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.EmployeeWageUpdateDto;
import com.rich.sodam.dto.request.LocationUpdateDto;
import com.rich.sodam.dto.request.OperatingHoursUpdateDto.DayOperatingHours;
import com.rich.sodam.dto.request.StoreRegistrationDto;
import com.rich.sodam.dto.request.StoreUpdateDto;
import com.rich.sodam.dto.response.StoreEmployeeResponseDto;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import com.rich.sodam.service.support.AfterCommitExecutor;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
    private final PlanAccessService planAccessService;
    private final DomainEventService domainEventService;
    private final LiveSyncPublisher liveSyncPublisher;
    private final PayrollRepository payrollRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmploymentTypeChangeLogRepository employmentTypeChangeLogRepository;
    private final MonthlySalaryCalculator monthlySalaryCalculator;
    private final CacheManager cacheManager;
    private final jakarta.persistence.EntityManager entityManager;
    private final AfterCommitExecutor afterCommitExecutor;

    /**
     * "stores" 캐시 무효화를 트랜잭션 커밋 이후로 미룬다(DB_OPTIMIZATION_PLAN.md §2.8(c)).
     * {@code @CacheEvict}(기본 beforeInvocation=false)는 "메서드 반환 시점"에 실행되는데, 이는
     * {@code @Transactional}의 실제 커밋 완료 "직전"이라 evict 직후~커밋 완료 사이의 짧은 창에 다른
     * 스레드가 아직 반영 안 된 값으로 캐시를 재적재할 수 있다(운영 RedisCacheManager 는 여러 인스턴스가
     * 공유해 이 레이스가 실질적 영향을 준다). {@link LiveSyncPublisher}가 WebSocket 발행에 쓰는 것과
     * 동일한 {@link AfterCommitExecutor} 패턴으로 커밋 이후로 미룬다.
     */
    private void evictStoresCacheAfterCommit(java.util.function.Consumer<Cache> evictAction) {
        afterCommitExecutor.execute(() -> {
            Cache cache = cacheManager.getCache("stores");
            if (cache != null) {
                evictAction.accept(cache);
            }
        });
    }

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

        if (storeDto.getOperatingHours() != null) {
            store.updateOperatingHours(toOperatingHours(storeDto.getOperatingHours()));
        }

        if (storeDto.getPayrollCycle() != null) {
            store.updatePayrollCycle(storeDto.getPayrollCycle().toDomain());
        }
        return store;
    }

    private OperatingHours toOperatingHours(List<DayOperatingHours> dayOperatingHours) {
        OperatingHours operatingHours = OperatingHours.createDefault();
        if (dayOperatingHours == null) {
            return operatingHours;
        }

        validateOperatingHoursRequest(dayOperatingHours);
        for (DayOperatingHours dayHours : dayOperatingHours) {
            boolean closed = Boolean.TRUE.equals(dayHours.getIsClosed());
            operatingHours.setDayOperatingHours(
                    dayHours.getDayOfWeek(),
                    dayHours.getOpenTime(),
                    dayHours.getCloseTime(),
                    closed
            );
        }
        return operatingHours;
    }

    private void validateOperatingHoursRequest(List<DayOperatingHours> dayOperatingHours) {
        if (dayOperatingHours == null || dayOperatingHours.isEmpty()) {
            throw new IllegalArgumentException("운영시간 정보는 필수입니다.");
        }
        if (dayOperatingHours.size() != 7) {
            throw new IllegalArgumentException("모든 요일(7일)의 운영시간 정보가 필요합니다.");
        }

        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        boolean allClosed = true;
        for (DayOperatingHours dayHours : dayOperatingHours) {
            if (dayHours.getDayOfWeek() == null) {
                throw new IllegalArgumentException("요일은 필수입니다.");
            }
            if (!days.add(dayHours.getDayOfWeek())) {
                throw new IllegalArgumentException("중복된 요일이 있습니다.");
            }
            dayHours.validate();
            if (!Boolean.TRUE.equals(dayHours.getIsClosed())) {
                allClosed = false;
            }
        }
        if (days.size() != 7) {
            throw new IllegalArgumentException("누락된 요일이 있습니다.");
        }
        if (allClosed) {
            throw new IllegalArgumentException("최소 하루는 운영해야 합니다.");
        }
    }

    @Override
    @Transactional
    // 새 매장 등록 시 master의 캐시된 매장목록(getStoresByMaster)을 무효화해야 한다.
    // 안 하면 방금 만든 매장이 홈/상세에서 누락되고 stale id로 StoreDetail 403이 난다.
    // evict 는 커밋 이후로 미룸(§2.8(c), evictStoresCacheAfterCommit 참조) — 어노테이션 대신 명시 호출.
    public Store registerStoreWithMaster(Long userId, StoreRegistrationDto storeDto) {
        evictStoresCacheAfterCommit(cache -> cache.evict("master:" + userId));
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

        // 멀티매장 게이트: 2번째 이상 매장은 MULTI_STORE(PRO 이상) 플랜에서만 등록 가능
        int existingStoreCount = masterStoreRelationRepository.findByMasterProfile(masterProfile).size();
        planAccessService.assertCanRegisterAdditionalStore(existingStoreCount);

        // 매장 생성
        Store store = getStore(storeDto);

        storeRepository.save(store);

        // 사장-매장 관계 생성
        MasterStoreRelation relation = new MasterStoreRelation(masterProfile, store);
        masterStoreRelationRepository.save(relation);

        return store;
    }

    @Override
    @Retryable(
            retryFor = {OptimisticLockingFailureException.class, PessimisticLockingFailureException.class},
            maxAttempts = 3, backoff = @Backoff(delay = 50, multiplier = 2))
    @Transactional
    // 직원 배정 → 재직 인원 변동. 사장 매장목록 캐시 무효화(3-arg 는 자기호출이라 프록시 우회 →
    // 진입점인 이 메서드에 둔다). evict 는 커밋 이후로 미룸(§2.8(c)).
    // 락 충돌은 감지 후 재시도가 기본 전략(§2.8 대응방안) — @Retryable 이 @Transactional 바깥에서
    // 감싸도록 SodamApplication의 @EnableRetry(order=...) 로 순서를 고정해뒀다(재시도마다 새 트랜잭션).
    public void assignUserToStoreAsEmployee(Long userId, Long storeId) {
        evictStoresCacheAfterCommit(Cache::clear);
        this.assignUserToStoreAsEmployee(userId, storeId, null);
    }

    /**
     * 매장 코드로 직원 본인이 가입 (PRD_EMPLOYEE E-301).
     * - storeCode 가 활성 매장과 일치해야 함
     * - 기존 동일 관계 비활성 상태면 재활성, 활성이면 그대로 반환
     * - 시급은 매장 기본 시급 사용
     */
    @Override
    @Retryable(
            retryFor = {OptimisticLockingFailureException.class, PessimisticLockingFailureException.class},
            maxAttempts = 3, backoff = @Backoff(delay = 50, multiplier = 2))
    @Transactional
    // 직원 입사 → 매장 재직 인원 변동. 사장 매장목록(getStoresByMaster, @Cacheable 'master:{id}')의
    // employeeCount 가 stale 로 남지 않도록 stores 캐시 무효화(masterId 를 모르므로 allEntries).
    // evict 는 커밋 이후로 미룸(§2.8(c)) — 3-arg assignUserToStoreAsEmployee 를 자기호출하므로 그쪽
    // 어노테이션은 안 타서 여기서 별도로 등록해야 함.
    public Store joinStoreByCode(Long userId, String storeCode) {
        evictStoresCacheAfterCommit(Cache::clear);
        Store store = storeRepository.findActiveByStoreCode(storeCode)
                .orElseThrow(() -> new EntityNotFoundException("매장 코드와 일치하는 매장을 찾을 수 없습니다."));
        assignUserToStoreAsEmployee(userId, store.getId(), null);
        // 비활성 → 활성 복구
        EmployeeProfile profile = employeeProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("직원 프로필이 없습니다."));
        employeeStoreRelationRepository.findByEmployeeProfileAndStore(profile, store)
                .ifPresent(rel -> { if (Boolean.FALSE.equals(rel.getIsActive())) rel.changeActive(true); });
        // 사장(및 같은 매장 직원) 화면 라이브 동기화 — 인원수·직원목록 즉시 갱신.
        liveSyncPublisher.publishStore(store.getId(), LiveSyncPublisher.SyncType.EMPLOYEES_CHANGED);
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
    @Transactional(readOnly = true)
    public com.rich.sodam.dto.response.PayrollCyclePeriodDto resolvePayrollCyclePeriod(
            Long storeId, java.time.YearMonth month) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다. ID: " + storeId));
        com.rich.sodam.domain.PayrollCycle cycle = store.getPayrollCycle();
        if (cycle == null || !cycle.isConfigured()) {
            return com.rich.sodam.dto.response.PayrollCyclePeriodDto.notConfigured();
        }
        java.time.YearMonth base = month != null ? month : cycle.cycleMonthContaining(java.time.LocalDate.now());
        return new com.rich.sodam.dto.response.PayrollCyclePeriodDto(
                true, cycle.resolveStart(base), cycle.resolveEnd(base), cycle.resolvePayDate(base));
    }

    @Override
    @Transactional
    public com.rich.sodam.dto.response.OperatingHoursResponseDto updateOperatingHours(
            Long storeId, com.rich.sodam.dto.request.OperatingHoursUpdateDto dto) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다. ID: " + storeId));
        com.rich.sodam.domain.OperatingHours oh = com.rich.sodam.domain.OperatingHours.createDefault();
        if (dto.getOperatingHours() != null) {
            validateOperatingHoursRequest(dto.getOperatingHours());
            for (DayOperatingHours d : dto.getOperatingHours()) {
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
    @Retryable(
            retryFor = {OptimisticLockingFailureException.class, PessimisticLockingFailureException.class},
            maxAttempts = 3, backoff = @Backoff(delay = 50, multiplier = 2))
    @Transactional
    // 직원 활성/비활성 → 재직 인원 변동. 사장 매장목록 employeeCount 캐시 무효화(커밋 이후, §2.8(c)).
    public void setEmployeeActive(Long storeId, Long employeeId, boolean active) {
        evictStoresCacheAfterCommit(Cache::clear);
        if (storeId == null || employeeId == null) {
            throw new IllegalArgumentException("storeId 와 employeeId 는 필수입니다.");
        }
        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findRelation(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "직원-매장 관계를 찾을 수 없습니다. employeeId=" + employeeId + ", storeId=" + storeId));
        relation.changeActive(active);
        employeeStoreRelationRepository.save(relation);
        // 재직 인원 변동 → 5인 이상 여부 재산정(§56 가산 적용 정상화)
        recountEmployeesAndApply(relation.getStore());
        // 사장 화면 라이브 동기화 — 직원 활성/비활성 즉시 반영.
        liveSyncPublisher.publishStore(storeId, LiveSyncPublisher.SyncType.EMPLOYEES_CHANGED);
    }

    /**
     * 매장의 활성 재직 인원 수로 {@code fiveOrMoreEmployees} 플래그를 재산정·반영한다.
     * 직원 추가/해지 등 재직 인원이 변하는 지점에서 호출한다.
     *
     * <p>비관적 락으로 lost update를 방지한다(§2.8(a)): {@code store}를 {@code FOR UPDATE}로 잠가 같은
     * 매장에 대한 동시 재계산을 완전히 직렬화하고, 카운트도 잠금 읽기로 다시 조회해 다른 트랜잭션이
     * 이미 커밋한 변경분을 반드시 반영한다(일반 읽기는 REPEATABLE READ 스냅샷 때문에 놓칠 수 있음 —
     * {@link EmployeeStoreRelationRepository#countByStoreAndIsActiveTrueForUpdate} 문서 참조).</p>
     *
     * <p>{@code entityManager.refresh(store, PESSIMISTIC_WRITE)}를 쓴다 — 호출부가 이 메서드 이전에
     * 이미 락 없이 같은 {@code store}를 로드해둔 경우가 대부분인데, 리포지토리로 재조회하면 같은
     * 영속성 컨텍스트 1차 캐시 때문에 이미 관리 중인(stale) 인스턴스가 그대로 반환돼 다른 트랜잭션이
     * 그 사이 커밋한 {@code version}을 못 봐서 save() 시 낙관적 락 예외가 난다(실제로 재현·확인).
     * {@code refresh}는 잠금 획득과 함께 항상 최신 DB 값으로 덮어써 이 문제를 없앤다.</p>
     */
    private void recountEmployeesAndApply(Store store) {
        entityManager.refresh(store, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        long activeCount = employeeStoreRelationRepository.countByStoreAndIsActiveTrueForUpdate(store);
        store.applyEmployeeCount((int) activeCount);
        storeRepository.save(store);
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

        if (user.getUserGrade() == UserGrade.MASTER
                || user.getUserGrade() == UserGrade.MANAGER
                || user.getUserGrade() == UserGrade.BOSSES) {
            throw new IllegalArgumentException("사업주 또는 특권 계정은 직원으로 할당할 수 없습니다.");
        }

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
        boolean newJoin = existingRelation.isEmpty();
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
        // 재직 인원 변동 → 5인 이상 여부 재산정(§56 가산 적용 정상화)
        recountEmployeesAndApply(store);
        // 직원이 매장에 새로 합류한 경우 계측 이벤트 발화(전환·activation 분모)
        if (newJoin) {
            domainEventService.record(DomainEventType.EMPLOYEE_REGISTERED, userId, storeId, null);
        }
    }

    @Override
    @Retryable(
            retryFor = {OptimisticLockingFailureException.class, PessimisticLockingFailureException.class},
            maxAttempts = 3, backoff = @Backoff(delay = 50, multiplier = 2))
    @Transactional
    // 시급 변경 캐시 무효화도 커밋 이후로 미룸(§2.8(c)) — 어노테이션 대신 명시 호출.
    // EmployeeStoreRelation.@Version 충돌(동시 시급 변경) 시 재시도(§2.8(b)).
    public void updateEmployeeWage(EmployeeWageUpdateDto wageDto, Long changedBy) {
        evictStoresCacheAfterCommit(cache ->
                cache.evict("wage:" + wageDto.getEmployeeId() + ":" + wageDto.getStoreId()));
        EmployeeProfile employeeProfile = employeeProfileRepository.findById(wageDto.getEmployeeId())
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));

        Store store = storeRepository.findById(wageDto.getStoreId())
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException("사원-매장 관계를 찾을 수 없습니다."));

        assertAtLeastMinimumWage(wageDto.getCustomHourlyWage());

        // 고용형태(월급제) 설정 — employmentType 제공 시에만 적용 (null=변경 없음, 기존 FE 호환)
        if (wageDto.getEmploymentType() != null) {
            applyEmploymentTypeChange(relation, wageDto, changedBy);
        }

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

    /**
     * 고용형태(시급제↔월급제)·월급·개인 4대보험 설정 적용 + 전환 이력 기록.
     *
     * <p>전환 이력({@link EmploymentTypeChangeLog})은 "언제부터 월급제였는지"의 증빙으로,
     * 이미 확정·지급된 과거 정산분에 새 형태가 소급 적용되지 않았음을 입증한다(분쟁 대비).</p>
     */
    private void applyEmploymentTypeChange(EmployeeStoreRelation relation,
                                           EmployeeWageUpdateDto wageDto, Long changedBy) {
        EmploymentType fromType = relation.getEmploymentType();
        EmploymentType toType = wageDto.getEmploymentType();
        // 시급제로 (재)설정하면 월급은 비운다 — HOURLY + monthlySalary 잔존은 상태 모순
        Integer newSalary = (toType == EmploymentType.MONTHLY_SALARY) ? wageDto.getMonthlySalary() : null;

        if (toType == EmploymentType.MONTHLY_SALARY) {
            if (newSalary == null) {
                // DTO Bean Validation(@AssertTrue)이 1차 차단 — 서비스 직접 호출 대비 방어선
                throw new BusinessException("월급제(MONTHLY_SALARY)는 monthlySalary가 필수입니다.",
                        "MONTHLY_SALARY_REQUIRED");
            }
            assertMonthlySalaryAtLeastMinimum(newSalary, relation);
        }

        // 변경 발생 판정·적용은 관계 도메인 단일 소스 — 근로계약서 저장 경로(LaborContractService)와
        // 공유해 어느 경로로 전환돼도 "실제 변경 시에만 1건" 이력이 남는다.
        boolean changed = relation.applyEmploymentType(toType, newSalary);
        relation.setSocialInsuranceEnrolled(wageDto.getSocialInsuranceEnrolled());

        if (changed) {
            employmentTypeChangeLogRepository.save(EmploymentTypeChangeLog.of(
                    relation.getId(), fromType, toType, newSalary, changedBy));
        }
    }

    /**
     * 월급이 최저임금 월 환산액 이상인지 검증(최저임금법 §6, 미달 설정은 §28 형사처벌 리스크라 저장 시점 차단).
     * 기준: 최저시급 × 월 통상임금 산정 기준시간 — 주 소정근로시간 약정(근로계약서 전파값)이 있으면
     * 그 기준시간(정산 통상시급 분모와 동일, 예: 주 20h→104h), 없으면 약정 소정근로일 비례
     * (주40h=209h), 일 소정근로시간은 표준 8h 가정. 단시간 월급제의 과차단 방지.
     */
    private void assertMonthlySalaryAtLeastMinimum(int monthlySalary, EmployeeStoreRelation relation) {
        int year = LocalDate.now().getYear();
        BigDecimal minMonthly = MinimumWage.hourlyFor(year)
                .multiply(monthlySalaryCalculator.monthlyStandardHours(
                        relation.getContractedWeeklyHours(), relation.getContractedWeeklyDays(), 8.0));
        if (BigDecimal.valueOf(monthlySalary).compareTo(minMonthly) < 0) {
            throw new BusinessException(String.format(
                    "%d년 최저임금 월 환산액(%,d원) 미만으로는 월급을 설정할 수 없습니다. 입력값: %,d원",
                    year, minMonthly.intValue(), monthlySalary),
                    "WAGE_BELOW_MINIMUM");
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
    public List<Store> getStoresByMaster(Long userId) {
        MasterProfile masterProfile = masterProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사장 프로필을 찾을 수 없습니다."));

        YearMonth thisMonth = YearMonth.now();
        LocalDate monthStart = thisMonth.atDay(1);
        LocalDate monthEnd = thisMonth.atEndOfMonth();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime tomorrowStart = todayStart.plusDays(1);

        return masterStoreRelationRepository.findByMasterProfile(masterProfile)
                .stream()
                .map(MasterStoreRelation::getStore)
                .peek(store -> {
                    store.setEmployeeCount((int) employeeStoreRelationRepository.countByStoreAndIsActiveTrue(store));
                    long laborCost = payrollRepository.findByStoreIdAndPeriod(store.getId(), monthStart, monthEnd)
                            .stream()
                            .mapToLong(payroll -> payroll.getGrossWage() == null ? 0L : payroll.getGrossWage())
                            .sum();
                    store.setMonthlyLaborCost(laborCost);
                    store.setTodayAttendance(attendanceRepository.findByStoreAndDate(store, todayStart, tomorrowStart).size());
                    store.setMonthlyRevenue(0L);
                })
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
    public List<StoreEmployeeResponseDto> getEmployeesByStore(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        return employeeStoreRelationRepository.findByStore(store)
                .stream()
                .map(relation -> StoreEmployeeResponseDto.from(relation.getEmployeeProfile().getUser()))
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

        // 급여 정산 주기 — 전달 시 전체 교체(검증·0 패딩은 PayrollCycle.of)
        if (updateDto.getPayrollCycle() != null) {
            store.updatePayrollCycle(updateDto.getPayrollCycle().toDomain());
        }

        return storeRepository.save(store);
    }

    @Override
    @Transactional
    // 매장 삭제는 드물고 어느 master 캐시인지 알기 어려우므로 stores 캐시 전체 무효화(커밋 이후, §2.8(c)).
    public void deleteStore(Long storeId) {
        evictStoresCacheAfterCommit(Cache::clear);
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
        store.softDelete();
        storeRepository.save(store);
    }
}
