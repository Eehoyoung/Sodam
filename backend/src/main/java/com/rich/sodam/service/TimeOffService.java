package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.domain.type.TimeOffUnit;
import com.rich.sodam.dto.response.TimeOffResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.TimeOffRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

/**
 * 휴가 신청 CRUD·승인/거부 워크플로.
 *
 * <p>직원 신청 → 사장에게 알림 → 사장 승인(연차 잔여 검증) 또는 거부(사유 필수) → 직원에게 알림.
 * 알림은 {@link AttendanceApprovalService}와 동일한 기존 패턴(NotificationService.push)을 재사용한다.</p>
 */
@Service
@RequiredArgsConstructor
public class TimeOffService {

    private final TimeOffRepository timeOffRepository;
    private final StoreRepository storeRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final UserRepository userRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final NotificationService notificationService;
    private final StorePermissionRecipientService permissionRecipients;
    private final AnnualLeaveEntitlementResolver annualLeaveEntitlementResolver;

    /**
     * 휴가 신청 생성(종일, 기존 호출부 호환). EmployeeProfile 이 없으면 자동 생성(셀프 신청 호환).
     */
    @Transactional
    public TimeOffResponse createTimeOffRequest(Long employeeId, Long storeId, LocalDate startDate,
                                                 LocalDate endDate, String reason) {
        return createTimeOffRequest(employeeId, storeId, TimeOffLeaveType.ANNUAL, TimeOffUnit.FULL_DAY,
                startDate, endDate, null, null, reason);
    }

    /**
     * 휴가 신청 생성(유형·단위·시간 지정). EmployeeProfile 이 없으면 자동 생성(셀프 신청 호환).
     */
    @Transactional
    public TimeOffResponse createTimeOffRequest(Long employeeId, Long storeId, TimeOffLeaveType leaveType,
                                                 TimeOffUnit unit, LocalDate startDate, LocalDate endDate,
                                                 LocalTime startTime, LocalTime endTime,
                                                 String reason) {
        if (employeeId == null || storeId == null) {
            throw new IllegalArgumentException("employeeId, storeId 는 필수입니다.");
        }
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseGet(() -> {
                    // 셀프 신청 호환 — User 가 있으면 EmployeeProfile 자동 생성.
                    User user = userRepository.findById(employeeId)
                            .orElseThrow(() -> new NoSuchElementException("직원을 찾을 수 없습니다."));
                    EmployeeProfile newProfile = new EmployeeProfile(user);
                    return employeeProfileRepository.save(newProfile);
                });

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));

        TimeOffLeaveType resolvedType = leaveType != null ? leaveType : TimeOffLeaveType.ANNUAL;
        TimeOffUnit resolvedUnit = unit != null ? unit : TimeOffUnit.FULL_DAY;
        if (resolvedUnit == TimeOffUnit.HALF_DAY && (startDate == null || !startDate.equals(endDate))) {
            throw new IllegalArgumentException("반차 신청은 시작일과 종료일이 같아야 해요.");
        }
        if (resolvedUnit == TimeOffUnit.HOURS) {
            if (startDate == null || !startDate.equals(endDate)) {
                throw new IllegalArgumentException("시간 단위 신청은 시작일과 종료일이 같아야 해요.");
            }
            if (startTime == null || endTime == null || !endTime.isAfter(startTime)) {
                throw new IllegalArgumentException("시작 시각은 종료 시각보다 빨라야 해요.");
            }
        }

        TimeOff timeOff = new TimeOff(employee, store, resolvedType, resolvedUnit,
                startDate, endDate, startTime, endTime, reason);
        assertNoOverlap(timeOff);
        TimeOff saved = timeOffRepository.save(timeOff);

        notifyMasters(saved);
        return toResponse(saved);
    }

    /**
     * 휴가 신청 승인 — leaveType=ANNUAL 이면 잔여 연차를 재검증해 음수가 되면 승인을 막는다.
     */
    @Transactional
    public TimeOffResponse approveTimeOffRequest(Long timeOffId) {
        TimeOff timeOff = findTimeOff(timeOffId);
        if (timeOff.getStatus() != TimeOffStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 휴가 신청이에요.");
        }

        if (timeOff.getLeaveType() == TimeOffLeaveType.ANNUAL) {
            assertSufficientAnnualLeaveBalance(timeOff);
        }

        timeOff.approve();
        TimeOff saved = timeOffRepository.save(timeOff);

        notifyEmployeeDecision(saved, true, null);
        return toResponse(saved);
    }

    /**
     * 휴가 신청 거부. §60⑤ 시기변경권("사업 운영에 막대한 지장")이 사장이 연차 사용을 거부할 수
     * 있는 유일한 법적 근거다 — UI 에서 사유 입력을 강제해 이 요건을 유도하도록 사유를 필수로 받는다.
     */
    @Transactional
    public TimeOffResponse rejectTimeOffRequest(Long timeOffId, String rejectReason) {
        if (rejectReason == null || rejectReason.isBlank()) {
            throw new IllegalArgumentException("거부 사유를 입력해 주세요.");
        }
        TimeOff timeOff = findTimeOff(timeOffId);
        if (timeOff.getStatus() != TimeOffStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 휴가 신청이에요.");
        }

        timeOff.reject(rejectReason);
        TimeOff saved = timeOffRepository.save(timeOff);

        notifyEmployeeDecision(saved, false, rejectReason);
        return toResponse(saved);
    }

    /**
     * 특정 매장의 모든 휴가 신청 조회
     */
    @Transactional(readOnly = true)
    public List<TimeOffResponse> getTimeOffsByStore(Long storeId) {
        Store store = store(storeId);
        return toResponses(timeOffRepository.findByStore(store));
    }

    /**
     * 특정 매장의 특정 상태의 휴가 신청 조회
     */
    @Transactional(readOnly = true)
    public List<TimeOffResponse> getTimeOffsByStoreAndStatus(Long storeId, TimeOffStatus status) {
        Store store = store(storeId);
        return toResponses(timeOffRepository.findByStoreAndStatus(store, status));
    }

    /**
     * 특정 직원의 모든 휴가 신청 조회 — DTO 반환(TimeOffController 용).
     */
    @Transactional(readOnly = true)
    public List<TimeOffResponse> getTimeOffResponsesByEmployee(Long employeeId) {
        return toResponses(getTimeOffsByEmployee(employeeId));
    }

    /**
     * 특정 직원의 모든 휴가 신청 조회 — 엔티티 반환(MyRequestController 등 내부에서 자체 매핑하는 호출부용).
     */
    @Transactional(readOnly = true)
    public List<TimeOff> getTimeOffsByEmployee(Long employeeId) {
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("직원을 찾을 수 없습니다."));

        return timeOffRepository.findByEmployee(employee);
    }

    /**
     * 특정 사장이 소유한 모든 매장의 대기 중인 휴가 신청 조회 — 엔티티 반환
     * (MasterMyPageResponseDto 조립 등 내부 재사용 호출부용).
     */
    @Transactional(readOnly = true)
    public List<TimeOff> getPendingTimeOffsByMaster(Long masterId) {
        return timeOffRepository.findPendingTimeOffsByMasterId(masterId);
    }

    /**
     * 특정 사장이 소유한 모든 매장의 대기 중인 휴가 신청 조회 — DTO 반환(컨트롤러 직접 노출용).
     */
    @Transactional(readOnly = true)
    public List<TimeOffResponse> getPendingTimeOffResponsesByMaster(Long masterId) {
        return toResponses(getPendingTimeOffsByMaster(masterId));
    }

    /**
     * 특정 사장이 소유한 모든 매장의 대기 중인 휴가 신청 수 조회
     */
    @Transactional(readOnly = true)
    public int countPendingTimeOffsByMaster(Long masterId) {
        return timeOffRepository.countTimeOffsByMasterIdAndStatus(masterId, TimeOffStatus.PENDING);
    }

    private TimeOff findTimeOff(Long timeOffId) {
        return timeOffRepository.findById(timeOffId)
                .orElseThrow(() -> new NoSuchElementException("휴가 신청을 찾을 수 없습니다."));
    }

    private Store store(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));
    }

    /**
     * 같은 직원·매장에서 기간이 겹치는 PENDING/APPROVED 신청이 이미 있으면 새 신청을 막는다
     * (이중 차감·중복 승인 방지). 단, 둘 다 시간단위(HOURS)이고 실제 시각 구간이 겹치지 않으면
     * 통과시킨다(같은 날 오전/오후 각각 외출 등 정당한 케이스).
     */
    private void assertNoOverlap(TimeOff candidate) {
        List<TimeOff> overlapping = timeOffRepository.findOverlappingForEmployee(
                candidate.getEmployee(), candidate.getStore(), candidate.getStartDate(), candidate.getEndDate(),
                List.of(TimeOffStatus.PENDING, TimeOffStatus.APPROVED));
        boolean conflict = overlapping.stream().anyMatch(existing -> conflicts(candidate, existing));
        if (conflict) {
            throw new IllegalStateException("이미 같은 기간에 신청했거나 승인된 휴가가 있어요.");
        }
    }

    private boolean conflicts(TimeOff candidate, TimeOff existing) {
        boolean bothHours = candidate.getUnit() == TimeOffUnit.HOURS && existing.getUnit() == TimeOffUnit.HOURS;
        if (!bothHours) {
            return true; // 날짜 구간은 이미 겹침(쿼리에서 필터링됨)
        }
        LocalTime cs = candidate.getStartTime();
        LocalTime ce = candidate.getEndTime();
        LocalTime es = existing.getStartTime();
        LocalTime ee = existing.getEndTime();
        if (cs == null || ce == null || es == null || ee == null) {
            return true; // 정보 부족 — 안전하게 충돌로 간주
        }
        return cs.isBefore(ee) && es.isBefore(ce);
    }

    /**
     * 승인 직전 잔여 연차 재검증 — 발생 연차(추정) − 현재 연차연도 내 이미 승인된 같은 매장
     * 연차(ANNUAL) 소비일수 − 이번 신청 소비일수 &lt; 0 이면 승인을 막는다.
     *
     * <p>발생 연차는 현재 연차연도(입사일 기준 1년 주기) 동안의 몫이므로, 사용량도 전체
     * 재직기간이 아니라 같은 주기 내 것만 대응 비교한다({@link AnnualLeaveEntitlementResolver
     * #currentLeaveYearWindow}) — 그렇지 않으면 근속이 쌓일수록 과거 연차연도 사용분까지
     * 계속 차감돼 잔여가 부당하게 줄어든다.</p>
     */
    private void assertSufficientAnnualLeaveBalance(TimeOff timeOff) {
        Long employeeId = timeOff.getEmployee() != null ? timeOff.getEmployee().getId() : null;
        Long storeId = timeOff.getStore() != null ? timeOff.getStore().getId() : null;
        if (employeeId == null || storeId == null) {
            return; // 정보 부족 — 검증 불가, 기존 동작대로 통과(회귀 방지)
        }
        Optional<EmployeeStoreRelation> relationOpt = relationRepository.findRelation(employeeId, storeId);
        if (relationOpt.isEmpty()) {
            return; // 관계 정보가 없으면 검증 불가 — 통과
        }
        EmployeeStoreRelation relation = relationOpt.get();
        LocalDate today = LocalDate.now();
        boolean fiveOrMore = annualLeaveEntitlementResolver.isFiveOrMoreEmployees(timeOff.getStore());
        int entitled = annualLeaveEntitlementResolver.entitledDays(relation, today, fiveOrMore);
        AnnualLeaveEntitlementResolver.LeaveYearWindow window =
                annualLeaveEntitlementResolver.currentLeaveYearWindow(relation, today);

        Double dailyHours = annualLeaveEntitlementResolver.dailyContractedHoursOf(relation);
        var scheduledWorkDays = annualLeaveEntitlementResolver.scheduledWorkDaysOf(relation);
        double alreadyConsumed = timeOffRepository.findByEmployeeAndStatus(timeOff.getEmployee(), TimeOffStatus.APPROVED)
                .stream()
                .filter(t -> t.getStore() != null && storeId.equals(t.getStore().getId()))
                .filter(t -> t.getLeaveType() == TimeOffLeaveType.ANNUAL)
                .filter(t -> window.contains(t.getStartDate()))
                .mapToDouble(t -> t.computeConsumedDays(dailyHours, scheduledWorkDays))
                .sum();
        double thisConsumed = timeOff.computeConsumedDays(dailyHours, scheduledWorkDays);

        double remainingAfter = entitled - alreadyConsumed - thisConsumed;
        if (remainingAfter < 0) {
            throw new IllegalStateException("잔여 연차가 부족해요.");
        }
    }

    /**
     * 목록 변환 — 직원-매장 관계·근로계약서 스케줄 조회를 (employeeId, storeId) 쌍마다 한 번만
     * 수행하도록 메모이즈한다. 같은 직원의 휴가 신청 여러 건이 대개 같은 매장에 속해 있어,
     * 항목 수만큼 반복 조회하면 N+1 이 된다.
     */
    private List<TimeOffResponse> toResponses(List<TimeOff> timeOffs) {
        Map<String, Optional<EmployeeStoreRelation>> relationCache = new HashMap<>();
        return timeOffs.stream().map(t -> toResponse(t, relationCache)).toList();
    }

    private TimeOffResponse toResponse(TimeOff t) {
        return toResponse(t, new HashMap<>());
    }

    private TimeOffResponse toResponse(TimeOff t, Map<String, Optional<EmployeeStoreRelation>> relationCache) {
        Long employeeId = t.getEmployee() != null ? t.getEmployee().getId() : null;
        Long storeId = t.getStore() != null ? t.getStore().getId() : null;
        String employeeName = t.getEmployee() != null && t.getEmployee().getUser() != null
                ? t.getEmployee().getUser().getName() : null;

        Double dailyHours = null;
        Set<DayOfWeek> scheduledWorkDays = null;
        if (employeeId != null && storeId != null) {
            Optional<EmployeeStoreRelation> relationOpt = relationCache.computeIfAbsent(
                    employeeId + ":" + storeId, key -> relationRepository.findRelation(employeeId, storeId));
            dailyHours = relationOpt.map(annualLeaveEntitlementResolver::dailyContractedHoursOf).orElse(null);
            scheduledWorkDays = relationOpt.map(annualLeaveEntitlementResolver::scheduledWorkDaysOf).orElse(null);
        }

        return new TimeOffResponse(
                t.getId(), employeeId, employeeName, storeId,
                t.getLeaveType(), t.getUnit(),
                t.getStartDate(), t.getEndDate(), t.getStartTime(), t.getEndTime(),
                t.computeConsumedDays(dailyHours, scheduledWorkDays),
                t.getReason(), t.getRejectReason(), t.getStatus());
    }

    private void notifyMasters(TimeOff timeOff) {
        Long storeId = timeOff.getStore().getId();
        String empName = timeOff.getEmployee() != null && timeOff.getEmployee().getUser() != null
                ? timeOff.getEmployee().getUser().getName() : "직원";
        String storeName = timeOff.getStore().getStoreName() != null ? timeOff.getStore().getStoreName() : "매장";
        for (Long recipientUserId : permissionRecipients.ownersAndManagers(
                storeId, com.rich.sodam.domain.type.ManagerPermission.TIMEOFF_APPROVE)) {
            notificationService.push(recipientUserId, PushMessage.builder()
                    .title("휴가 신청")
                    .body(String.format("%s님이 %s 매장에 휴가를 신청했어요. (%s~%s)",
                            empName, storeName, timeOff.getStartDate(), timeOff.getEndDate()))
                    .deepLink("sodam://timeoff")
                    .data(Map.of("type", "TIME_OFF_REQUESTED"))
                    .build());
        }
    }

    private void notifyEmployeeDecision(TimeOff timeOff, boolean approved, String rejectReason) {
        Long employeeUserId = timeOff.getEmployee() != null ? timeOff.getEmployee().getId() : null;
        if (employeeUserId == null) {
            return;
        }
        PushMessage msg = approved
                ? PushMessage.builder()
                .title("휴가 승인됨")
                .body(String.format("%s~%s 휴가 신청이 승인됐어요.", timeOff.getStartDate(), timeOff.getEndDate()))
                .deepLink("sodam://timeoff")
                .data(Map.of("type", "TIME_OFF_APPROVED"))
                .build()
                : PushMessage.builder()
                .title("휴가 거부됨")
                .body("사유: " + rejectReason)
                .deepLink("sodam://timeoff")
                .data(Map.of("type", "TIME_OFF_REJECTED"))
                .build();
        notificationService.push(employeeUserId, msg);
    }
}
