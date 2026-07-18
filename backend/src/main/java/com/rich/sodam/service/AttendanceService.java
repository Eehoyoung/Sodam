package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.dto.request.ManualAttendanceRequestDto;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.exception.InvalidOperationException;
import com.rich.sodam.exception.LocationVerificationException;
import com.rich.sodam.exception.NfcVerificationException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 출퇴근 관리 서비스
 * 직원들의 출근/퇴근 기록을 처리하고 관리하는 비즈니스 로직을 제공합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    /**
     * 오프라인 큐 적재 시각(queuedAt) 수락 임계. 서버 수신 시각과의 차이가 이 값 이내면
     * queuedAt 을 실제 출퇴근 시각으로 신뢰하고, 초과하면 서버시각으로 폴백한다(과거 시각 위조 방지).
     */
    private static final Duration OFFLINE_QUEUE_MAX_SKEW = Duration.ofHours(4);

    /** 진행 중(퇴근 전) 근무·미확정 종료시각을 "사실상 무한대"로 취급하기 위한 상한값(§2.8(d)). */
    private static final LocalDateTime FAR_FUTURE = LocalDateTime.MAX;

    private final AttendanceRepository attendanceRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final LocationVerificationService locationService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final DomainEventService domainEventService;
    private final LiveSyncPublisher liveSyncPublisher;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final NotificationService notificationService;
    private final NfcVerificationService nfcVerificationService;

    /**
     * 위치정보 수집·이용 동의 여부를 강제한다(위치정보법 §18·§19, G-1).
     * GPS 좌표를 수집·검증하기 전에 동의가 없으면 차단한다 — 무동의 위치수집은 형사처벌 대상.
     */
    private void assertLocationConsent(Long userId) {
        boolean agreed = userRepository.findById(userId)
                .map(com.rich.sodam.domain.User::hasAgreedLocationInfo)
                .orElse(false);
        if (!agreed) {
            throw new InvalidOperationException(
                    "위치정보 수집·이용 동의가 필요합니다. 위치 동의 후 GPS 출퇴근을 이용해 주세요.");
        }
    }

    /**
     * 직원 출근 처리 (위치 검증 포함)
     */
    @Transactional
    public Attendance checkInWithVerification(Long employeeId, Long storeId, Double latitude, Double longitude) {
        return checkInWithVerification(employeeId, storeId, latitude, longitude, null);
    }

    /**
     * 직원 출근 처리 (위치 검증 + 오프라인 큐 시각 수락).
     *
     * <p>{@code queuedAt} 이 주어지고 서버 수신 시각과의 차이가 임계({@link #OFFLINE_QUEUE_MAX_SKEW}) 이내면
     * 그 시각을 출근시각으로 채택하고, 초과(또는 미래 시각)면 서버시각으로 폴백한다.
     */
    @Transactional
    // 컨트롤러가 프록시로 호출하는 진입점에 캐시 무효화를 둔다. 내부에서 this.checkIn(...) 자기호출은
    // AOP 프록시를 우회해 checkIn 의 @CacheEvict 가 발화하지 않으므로, 여기서 직접 evict 해야
    // 출근 직후 attendance 조회(오늘/기간)가 stale 캐시를 반환하지 않는다.
    @CacheEvict(value = "attendance", allEntries = true)
    public Attendance checkInWithVerification(Long employeeId, Long storeId,
                                              Double latitude, Double longitude, LocalDateTime queuedAt) {
        // 위치정보 동의 강제 (위치정보법 §18·§19) — GPS 좌표 수집·검증 전에 확인
        assertLocationConsent(employeeId);

        // 위치 검증
        if (!locationService.verifyUserInStore(storeId, latitude, longitude)) {
            throw LocationVerificationException.outOfRange();
        }

        Attendance result = checkIn(employeeId, storeId, latitude, longitude, resolveQueuedTime(queuedAt));
        // 사장 대시보드·직원 홈 라이브 동기화 — 출근 인원·근무 상태 즉시 반영.
        liveSyncPublisher.publishStore(storeId, LiveSyncPublisher.SyncType.ATTENDANCE_CHANGED);
        notifyOwnersAttendance(result, true);
        return result;
    }

    /**
     * 직원 출근 처리
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
    public Attendance checkIn(Long employeeId, Long storeId, Double latitude, Double longitude) {
        return checkIn(employeeId, storeId, latitude, longitude, null);
    }

    /**
     * 직원 출근 처리. {@code effectiveTime} 이 주어지면 그 시각을, null 이면 현재 시각을 출근시각으로 기록한다
     * (오프라인 큐 적재분 보정용 — 임계 검증은 호출부에서 끝난다).
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
    public Attendance checkIn(Long employeeId, Long storeId, Double latitude, Double longitude,
                              LocalDateTime effectiveTime) {
        // 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(employeeId, storeId);
        EmployeeProfile employeeProfile = context.employeeProfile();
        Store store = context.store();

        // 오늘의 출퇴근 기록 조회(매장 무관 — 다른 매장 근무와의 시간 겹침을 판정해야 하므로 유지)
        List<Attendance> todayAttendances = getTodayAttendances(employeeProfile);

        // 같은 날 다른 매장 근무는 허용하되 시간대 겹침은 차단(§2.8(d) 정책, Phase 2.5).
        // 과거에는 "당일 기록이 하나라도 있으면 무조건 차단"이라 매장 무관 전면 차단 버그였다.
        LocalDateTime newCheckInTime = effectiveTime != null ? effectiveTime : LocalDateTime.now();
        assertNoOverlappingAttendance(todayAttendances, storeId, newCheckInTime, null);

        // 시급 정보 가져오기
        Integer hourlyWage = context.employeeStoreRelation().getAppliedHourlyWage();

        // 첫 출근(activation 계측) 판정 — 저장 전 기존 기록 유무로 판단
        boolean isFirstCheckIn = !attendanceRepository
                .existsByEmployeeProfile_IdAndStore_Id(employeeId, storeId);

        // 새 출근 기록 생성. 오프라인 큐 시각이 있으면 그 시각으로, 없으면 현재 시각으로 기록.
        Attendance attendance = new Attendance(employeeProfile, store);
        if (effectiveTime != null) {
            attendance.manualCheckIn(effectiveTime, latitude, longitude, hourlyWage);
        } else {
            attendance.checkIn(latitude, longitude, hourlyWage);
        }

        Attendance saved = attendanceRepository.save(attendance);

        // 해당 직원-매장 최초 출근일 때만 1회 발화 (record 는 실패해도 흐름 영향 없음)
        if (isFirstCheckIn) {
            domainEventService.record(DomainEventType.FIRST_CHECK_IN, employeeId, storeId, null);
        }

        return saved;
    }

    /**
     * 직원 퇴근 처리 (위치 검증 포함)
     */
    @Transactional
    public Attendance checkOutWithVerification(Long employeeId, Long storeId, Double latitude, Double longitude) {
        return checkOutWithVerification(employeeId, storeId, latitude, longitude, null);
    }

    /**
     * 직원 퇴근 처리 (위치 검증 + 오프라인 큐 시각 수락). 임계 검증은 {@link #resolveQueuedTime}.
     */
    @Transactional
    // 진입점에 캐시 무효화 — this.checkOut(...) 자기호출은 프록시 우회로 checkOut 의 @CacheEvict 가
    // 발화하지 않는다(퇴근 후에도 today 조회가 checkOutTime=null 인 stale 레코드 반환 → '근무중' 잔류).
    @CacheEvict(value = "attendance", allEntries = true)
    public Attendance checkOutWithVerification(Long employeeId, Long storeId,
                                               Double latitude, Double longitude, LocalDateTime queuedAt) {
        // 위치정보 동의 강제 (위치정보법 §18·§19)
        assertLocationConsent(employeeId);

        // 위치 검증
        if (!locationService.verifyUserInStore(storeId, latitude, longitude)) {
            throw LocationVerificationException.outOfRange();
        }

        Attendance result = checkOut(employeeId, storeId, latitude, longitude, resolveQueuedTime(queuedAt));
        liveSyncPublisher.publishStore(storeId, LiveSyncPublisher.SyncType.ATTENDANCE_CHANGED);
        notifyOwnersAttendance(result, false);
        return result;
    }

    /**
     * NFC 전용 출근 처리 — GPS 좌표를 전혀 수집하지 않고, 매장에 등록된 활성 태그 태깅만으로 기록한다.
     *
     * <p>{@link #checkInWithVerification}의 NFC 대응 버전. 위치정보를 수집하지 않으므로
     * {@link #assertLocationConsent}는 호출하지 않는다(위치정보법 §18·§19 동의 대상 자체가 아님).
     * 태그 검증은 {@link NfcVerificationService#verifyTag}에 위임하고, 실패 시
     * {@link NfcVerificationException}으로 거부한다(대리출근 방지).</p>
     */
    @Transactional
    // 진입점에 캐시 무효화 — this.checkIn(...) 자기호출은 프록시를 우회해 checkIn 의 @CacheEvict 가
    // 발화하지 않는다(checkInWithVerification 과 동일한 이유).
    @CacheEvict(value = "attendance", allEntries = true)
    public Attendance checkInWithNfcVerification(Long employeeId, Long storeId, String tagId, LocalDateTime queuedAt) {
        var verifyResult = nfcVerificationService.verifyTag(storeId, tagId);
        if (!verifyResult.isSuccess()) {
            throw NfcVerificationException.invalidTag();
        }

        Attendance result = checkIn(employeeId, storeId, null, null, resolveQueuedTime(queuedAt));
        liveSyncPublisher.publishStore(storeId, LiveSyncPublisher.SyncType.ATTENDANCE_CHANGED);
        notifyOwnersAttendance(result, true);
        return result;
    }

    /**
     * NFC 전용 퇴근 처리 — {@link #checkInWithNfcVerification}과 대칭.
     */
    @Transactional
    @CacheEvict(value = "attendance", allEntries = true)
    public Attendance checkOutWithNfcVerification(Long employeeId, Long storeId, String tagId, LocalDateTime queuedAt) {
        var verifyResult = nfcVerificationService.verifyTag(storeId, tagId);
        if (!verifyResult.isSuccess()) {
            throw NfcVerificationException.invalidTag();
        }

        Attendance result = checkOut(employeeId, storeId, null, null, resolveQueuedTime(queuedAt));
        liveSyncPublisher.publishStore(storeId, LiveSyncPublisher.SyncType.ATTENDANCE_CHANGED);
        notifyOwnersAttendance(result, false);
        return result;
    }

    /**
     * 출/퇴근 등록을 매장 사장(들)에게 FCM 푸시.
     *
     * <p>발행은 트랜잭션 커밋 이후(afterCommit) — 롤백된 출퇴근으로 알림이 나가면 안 된다.
     * 이름/ID 는 세션이 살아있는 지금 미리 풀어둔다(afterCommit 시점엔 lazy 로딩 불가).
     * 실패는 삼킨다 — 알림이 출퇴근 본 트랜잭션을 깨지 않게.</p>
     */
    private void notifyOwnersAttendance(Attendance attendance, boolean isCheckIn) {
        try {
            if (attendance.getStore() == null) {
                return;
            }
            Long storeId = attendance.getStore().getId();
            String storeName = attendance.getStore().getStoreName() != null
                    ? attendance.getStore().getStoreName() : "매장";
            String employeeName = attendance.getEmployeeProfile() != null
                    && attendance.getEmployeeProfile().getUser() != null
                    && attendance.getEmployeeProfile().getUser().getName() != null
                    ? attendance.getEmployeeProfile().getUser().getName() : "직원";
            int workingMinutes = isCheckIn ? 0 : (int) attendance.getWorkingTimeInMinutes();
            List<Long> masterUserIds = masterStoreRelationRepository.findByStore_Id(storeId).stream()
                    .filter(r -> r.getMasterProfile() != null && r.getMasterProfile().getUser() != null)
                    .map(r -> r.getMasterProfile().getUser().getId())
                    .toList();
            if (masterUserIds.isEmpty()) {
                return;
            }
            Runnable send = () -> masterUserIds.forEach(masterUserId -> {
                if (isCheckIn) {
                    notificationService.notifyEmployeeCheckedIn(masterUserId, employeeName, storeName);
                } else {
                    notificationService.notifyEmployeeCheckedOut(masterUserId, employeeName, storeName, workingMinutes);
                }
            });
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        send.run();
                    }
                });
            } else {
                send.run();
            }
        } catch (Exception e) {
            log.debug("출퇴근 사장 푸시 스킵: {}", e.getMessage());
        }
    }

    /**
     * 직원 퇴근 처리
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
    public Attendance checkOut(Long employeeId, Long storeId, Double latitude, Double longitude) {
        return checkOut(employeeId, storeId, latitude, longitude, null);
    }

    /**
     * 직원 퇴근 처리. {@code effectiveTime} 이 주어지면 그 시각을 퇴근시각으로 기록한다(오프라인 큐 보정).
     * 단, 출근시각보다 이른 시각은 엔티티가 거부하므로 그 경우 현재 시각으로 폴백한다.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
    public Attendance checkOut(Long employeeId, Long storeId, Double latitude, Double longitude,
                               LocalDateTime effectiveTime) {
        // 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(employeeId, storeId);
        EmployeeProfile employeeProfile = context.employeeProfile();
        Store store = context.store();

        // 이 매장에서 진행 중인(퇴근 전) 기록을 정확히 특정한다(Phase 2.5) — 과거에는 "직원의 가장
        // 최근 기록"을 가져와, 다른 매장에서 아직 퇴근 전이면 그 기록이 엉뚱하게 종료될 수 있었다.
        List<Attendance> openAttendancesAtStore = attendanceRepository
                .findByEmployeeProfileAndStoreAndCheckOutTimeIsNullOrderByCheckInTimeDesc(employeeProfile, store);
        if (openAttendancesAtStore.isEmpty()) {
            throw new InvalidOperationException("해당 매장에 진행 중인 출근 기록이 없습니다.");
        }

        // 가장 최근 출근 기록 가져오기
        Attendance attendance = openAttendancesAtStore.get(0);

        // 퇴근 정보 업데이트. 오프라인 큐 시각이 출근시각 이후면 그 시각으로, 아니면 현재 시각으로.
        if (effectiveTime != null && attendance.getCheckInTime() != null
                && !effectiveTime.isBefore(attendance.getCheckInTime())) {
            attendance.manualCheckOut(effectiveTime, latitude, longitude);
        } else {
            attendance.checkOut(latitude, longitude);
        }

        return attendanceRepository.save(attendance);
    }

    /**
     * 특정 직원의 특정 기간 출퇴근 기록 조회
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "attendance", key = "'employee:' + #employeeId + ':' + #startDate.toString() + ':' + #endDate.toString()")
    public List<Attendance> getAttendancesByEmployeeAndPeriod(
            Long employeeId, LocalDateTime startDate, LocalDateTime endDate) {

        EmployeeProfile employeeProfile = getEmployeeProfile(employeeId);
        return attendanceRepository.findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                employeeProfile, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendancesByEmployeeStoreAndPeriod(
            Long employeeId, Long storeId, LocalDateTime startDate, LocalDateTime endDate) {

        EmployeeProfile employeeProfile = getEmployeeProfile(employeeId);
        Store store = getStore(storeId);
        return attendanceRepository.findByEmployeeProfileAndStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                employeeProfile, store, startDate, endDate);
    }

    /**
     * 특정 매장의 특정 기간 출퇴근 기록 조회
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "attendance", key = "'store:' + #storeId + ':' + #startDate.toString() + ':' + #endDate.toString()")
    public List<Attendance> getAttendancesByStoreAndPeriod(
            Long storeId, LocalDateTime startDate, LocalDateTime endDate) {

        Store store = getStore(storeId);
        return attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                store, startDate, endDate);
    }

    /**
     * 특정 직원의 특정 월 출퇴근 기록 조회.
     * 잘못된 month 값 또는 EmployeeProfile 미존재 시 빈 리스트 반환 (500 방지 — FE 호환).
     */
    @Transactional(readOnly = true)
    public List<Attendance> getMonthlyAttendancesByEmployee(Long employeeId, int year, int month) {
        if (employeeId == null) {
            return java.util.Collections.emptyList();
        }
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month 는 1~12 사이여야 해요. 입력: " + month);
        }
        // EmployeeProfile 이 없으면 (Personal 회원이 직접 호출하는 등) 빈 리스트로 응답.
        if (employeeProfileRepository.findById(employeeId).isEmpty()) {
            return java.util.Collections.emptyList();
        }

        LocalDateTime startOfMonth = DateTimeUtils.getStartOfMonth(year, month);
        LocalDateTime endOfMonth = DateTimeUtils.getEndOfMonth(year, month);

        return getAttendancesByEmployeeAndPeriod(employeeId, startOfMonth, endOfMonth);
    }

    /**
     * 수동 출퇴근 등록
     * ATTEND-004: 사업주가 직원 대신 출퇴근 기록을 수동으로 등록
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
    public Attendance registerManualAttendance(ManualAttendanceRequestDto request) {
        // 1. 사업주 권한 검증
        userService.validateMasterPermission(request.getRegisteredBy());

        // 2. 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(
                request.getEmployeeId(), request.getStoreId());

        // 3. 해당 날짜의 기존 출퇴근 기록과 시간대 겹침 확인(매장 무관 전면 차단 버그 수정, Phase 2.5)
        validateNoDuplicateAttendance(context.employeeProfile(), request.getStoreId(),
                request.getCheckInTime(), request.getCheckOutTime());

        // 4. 출퇴근 기록 생성
        Attendance attendance = createManualAttendance(context, request);

        return attendanceRepository.save(attendance);
    }

    /**
     * 사장 대리등록 시간대가 같은 날 기존 기록과 겹치는지 검증한다.
     *
     * <p>과거에는 "해당 날짜에 기록이 하나라도 있으면 무조건 거부"였다 — {@link #checkIn}과 완전히 같은
     * 매장-무관 전면 차단 버그였다(사장이 대신 등록하는 경로라 실사용자 체크인보다 드물게 호출되지만
     * 정책 위반은 동일). {@link #assertNoOverlappingAttendance}로 통일한다.</p>
     */
    private void validateNoDuplicateAttendance(EmployeeProfile employeeProfile, Long storeId,
                                               LocalDateTime checkInTime, LocalDateTime checkOutTime) {
        LocalDateTime startOfDay = checkInTime.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = checkInTime.toLocalDate().atTime(23, 59, 59);

        List<Attendance> existingAttendances = attendanceRepository
                .findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        employeeProfile, startOfDay, endOfDay);

        assertNoOverlappingAttendance(existingAttendances, storeId, checkInTime, checkOutTime);
    }

    /**
     * 수동 출퇴근 기록 생성
     */
    private Attendance createManualAttendance(EmployeeStoreRelationContext context,
                                              ManualAttendanceRequestDto request) {
        // 시급 정보 가져오기
        Integer hourlyWage = context.employeeStoreRelation().getAppliedHourlyWage();

        // 새 출퇴근 기록 생성
        Attendance attendance = new Attendance(context.employeeProfile(), context.store());

        // 수동 출근 처리 (위치 정보는 null로 설정)
        attendance.manualCheckIn(request.getCheckInTime(), null, null, hourlyWage);

        // 퇴근 시간이 있는 경우 수동 퇴근 처리
        if (request.getCheckOutTime() != null) {
            attendance.manualCheckOut(request.getCheckOutTime(), null, null);
        }

        return attendance;
    }

    /**
     * 오프라인 큐 적재 시각을 신뢰할지 판정한다.
     * 미래 시각이거나 서버시각과의 차이가 임계를 초과하면 null 을 반환(서버시각 폴백) — 과거 시각 위조 차단.
     *
     * @return 채택할 출퇴근 시각, 또는 null(서버시각 사용)
     */
    private LocalDateTime resolveQueuedTime(LocalDateTime queuedAt) {
        if (queuedAt == null) {
            return null;
        }
        LocalDateTime now = LocalDateTime.now();
        if (queuedAt.isAfter(now)) {
            return null; // 미래 시각 불허
        }
        if (Duration.between(queuedAt, now).compareTo(OFFLINE_QUEUE_MAX_SKEW) > 0) {
            return null; // 임계 초과 → 서버시각 폴백
        }
        return queuedAt;
    }

    /**
     * 직원 프로필을 조회합니다.
     */
    private EmployeeProfile getEmployeeProfile(Long employeeId) {
        return employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("EmployeeProfile", employeeId));
    }

    /**
     * 매장을 조회합니다.
     */
    private Store getStore(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("Store", storeId));
    }

    /**
     * 오늘 날짜의 출퇴근 기록을 조회합니다.
     */
    private List<Attendance> getTodayAttendances(EmployeeProfile employeeProfile) {
        // DateTimeUtils 활용으로 변경
        LocalDateTime startOfDay = DateTimeUtils.getStartOfDay();
        LocalDateTime endOfDay = DateTimeUtils.getEndOfDay();

        return attendanceRepository.findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                employeeProfile, startOfDay, endOfDay);
    }

    /**
     * 신규(또는 백필) 출퇴근 구간이 같은 날의 기존 기록과 시간대가 겹치는지 검증한다
     * (DB_OPTIMIZATION_PLAN.md §2.8(d), Phase 2.5).
     *
     * <p>정책: 같은 날 서로 다른 매장 근무는 허용하되, 시간대가 겹치면 안 된다 — 매장이 같든 다르든
     * "겹침" 자체만 차단한다(예: 아직 퇴근 안 한 매장이 있는데 다른 매장에 새로 출근하려는 시도,
     * 또는 사장이 수동 등록한 시간대가 이미 있는 다른 기록과 겹치는 경우).</p>
     *
     * <p>진행 중(퇴근 전) 기록은 끝을 모르므로 {@link #FAR_FUTURE}(사실상 무한대)로 취급한다 — 그래서
     * 어느 매장이든 퇴근 안 한 기록이 하나라도 있으면, 새 시작 시각이 그 기록의 시작 이후인 한 항상
     * 겹침으로 판정된다("두 곳에서 동시에 근무 중일 수 없다"는 규칙이 별도 분기 없이 자연스럽게 성립).
     * {@code newEnd} 가 null 이면(일반 실시간 체크인) 신규 쪽도 열린 구간으로 같은 방식으로 취급한다.</p>
     *
     * @param todayAttendances 오늘의 기존 출퇴근 기록(매장 무관 전체)
     * @param storeId          이번에 등록하려는 매장 ID(겹침 시 안내 메시지 분기용)
     * @param newStart         신규 구간 시작
     * @param newEnd           신규 구간 종료(모르면 null — 열린 구간으로 취급)
     */
    private void assertNoOverlappingAttendance(List<Attendance> todayAttendances, Long storeId,
                                                LocalDateTime newStart, LocalDateTime newEnd) {
        LocalDateTime effectiveNewEnd = newEnd != null ? newEnd : FAR_FUTURE;
        for (Attendance existing : todayAttendances) {
            LocalDateTime existingStart = existing.getCheckInTime();
            LocalDateTime effectiveExistingEnd = existing.getCheckOutTime() != null
                    ? existing.getCheckOutTime() : FAR_FUTURE;
            boolean overlaps = newStart.isBefore(effectiveExistingEnd) && existingStart.isBefore(effectiveNewEnd);
            if (overlaps) {
                boolean sameStore = existing.getStore() != null && existing.getStore().getId().equals(storeId);
                throw new InvalidOperationException(sameStore
                        ? "이미 해당 시간대에 출퇴근 기록이 있습니다."
                        : "해당 시간대는 다른 매장 근무 기록과 겹쳐요. 먼저 퇴근한 뒤 다시 시도해주세요.");
            }
        }
    }


    /**
     * 직원, 매장, 그리고 그들의 관계 정보를 한 번에 조회합니다.
     * Fetch Join을 사용하여 N+1 쿼리 문제를 해결합니다.
     */
    private EmployeeStoreRelationContext getEmployeeStoreContext(Long employeeId, Long storeId) {
        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeIdAndStoreIdWithDetails(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        String.format("사원(ID: %d)-매장(ID: %d) 관계를 찾을 수 없습니다.", employeeId, storeId)));

        return new EmployeeStoreRelationContext(
                relation.getEmployeeProfile(),
                relation.getStore(),
                relation);
    }

    /**
     * 직원, 매장, 그리고 그들의 관계 정보를 담는 내부 클래스
     */
    private record EmployeeStoreRelationContext(
            EmployeeProfile employeeProfile,
            Store store,
            EmployeeStoreRelation employeeStoreRelation) {
    }
}
