package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.dto.request.WorkShiftCreateRequest;
import com.rich.sodam.dto.request.WorkShiftNotifyRequest;
import com.rich.sodam.dto.request.WorkShiftUpdateRequest;
import com.rich.sodam.dto.response.WorkShiftNotifyResponse;
import com.rich.sodam.dto.response.WorkShiftResponse;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 근무 시프트 서비스 (B10/E-NEW-05). 사장 등록·삭제 + 매장/직원 본인 기간 조회.
 *
 * <p>매장 소유 검증은 컨트롤러(StoreAccessGuard)에서 수행. 삭제 시 매장 소유 일관성만 재확인.
 * 스코프: 등록·조회만 — 자동배정·채용 없음(Non-Goal).
 */
@Service
@RequiredArgsConstructor
public class WorkShiftService {

    private final WorkShiftRepository repository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final StoreRepository storeRepository;
    private final NotificationService notificationService;
    private final FixedScheduleService fixedScheduleService;

    @Transactional
    public WorkShiftResponse create(Long storeId, WorkShiftCreateRequest req) {
        assertActiveEmployeeInStore(req.getEmployeeId(), storeId);
        validateShiftTimes(req.getStartTime(), req.getEndTime());
        WorkShift shift = repository.save(WorkShift.create(
                req.getEmployeeId(), storeId, req.getShiftDate(),
                req.getStartTime(), req.getEndTime(), req.getMemo()));
        return WorkShiftResponse.from(shift);
    }

    /**
     * 시프트 수정(사장). 매장 소유 일관성 재확인 후 날짜·시각·메모 변경.
     * 변경 시 확정·알림 상태가 리셋되어 재확정·재알림이 필요해진다(직원 통보 정합성).
     */
    @Transactional
    public WorkShiftResponse update(Long storeId, Long shiftId, WorkShiftUpdateRequest req) {
        WorkShift shift = repository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("근무 일정을 찾을 수 없어요: " + shiftId));
        if (!shift.getStoreId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 근무 일정이 아니에요.");
        }
        validateShiftTimes(req.getStartTime(), req.getEndTime());
        shift.update(req.getShiftDate(), req.getStartTime(), req.getEndTime(), req.getMemo());
        return WorkShiftResponse.from(shift);
    }

    /**
     * 시프트 배정 직원 교체(대타 승인 흐름 — ShiftSwapService 에서 재사용).
     * 매장 소유 일관성 재확인 + 새 담당자의 재직 검증 후 담당자만 변경(날짜·시각 유지).
     */
    @Transactional
    public WorkShift reassignEmployee(Long storeId, Long shiftId, Long newEmployeeId) {
        WorkShift shift = repository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("근무 일정을 찾을 수 없어요: " + shiftId));
        if (!shift.getStoreId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 근무 일정이 아니에요.");
        }
        assertActiveEmployeeInStore(newEmployeeId, storeId);
        shift.reassignTo(newEmployeeId);
        return shift;
    }

    /**
     * 매장 기간 조회(사장). 조회 직전에 월급제 정규직 고정 스케줄을 조회 범위(to)까지 지연
     * 생성해 둔다 — 보드를 열 때마다 자연히 채워지므로 별도 배치 없이 "항상 고정"이 유지된다.
     */
    @Transactional(readOnly = true)
    public List<WorkShiftResponse> listForStore(Long storeId, LocalDate from, LocalDate to) {
        storeRepository.findById(storeId).ifPresent(store -> fixedScheduleService.ensureGeneratedThrough(store, to));
        return repository.findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(storeId, from, to).stream()
                .map(WorkShiftResponse::from)
                .toList();
    }

    /** 직원 본인 기간 조회. */
    @Transactional(readOnly = true)
    public List<WorkShiftResponse> listForEmployee(Long employeeId, LocalDate from, LocalDate to) {
        return repository.findByEmployeeIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(
                        employeeId, from, to).stream()
                .map(WorkShiftResponse::from)
                .toList();
    }

    @Transactional
    public WorkShiftNotifyResponse notifyConfirmed(Long storeId, WorkShiftNotifyRequest req) {
        validateNotifyRequest(req);

        List<WorkShift> unconfirmed = repository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNullOrderByShiftDateAsc(
                        storeId, req.getFrom(), req.getTo());
        unconfirmed.forEach(WorkShift::confirm);

        List<WorkShift> notificationTargets = repository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullAndConfirmationNotificationSentAtIsNullOrderByShiftDateAsc(
                        storeId, req.getFrom(), req.getTo());
        if (notificationTargets.isEmpty()) {
            return new WorkShiftNotifyResponse(storeId, req.getFrom(), req.getTo(), unconfirmed.size(), 0);
        }

        Map<Long, List<WorkShift>> shiftsByEmployee = notificationTargets.stream()
                .collect(Collectors.groupingBy(WorkShift::getEmployeeId));

        String storeName = storeRepository.findById(storeId)
                .map(store -> store.getStoreName() != null ? store.getStoreName() : "매장")
                .orElse("매장");
        String periodLabel = String.format("%s~%s", req.getFrom(), req.getTo());

        int notified = 0;
        for (Map.Entry<Long, List<WorkShift>> entry : shiftsByEmployee.entrySet()) {
            Long employeeId = entry.getKey();
            Optional<Long> employeeUserId = findActiveEmployeeUserId(employeeId, storeId);
            if (employeeUserId.isEmpty()) {
                continue;
            }
            notificationService.notifyWorkShiftConfirmed(employeeUserId.get(), storeName, periodLabel);
            entry.getValue().forEach(WorkShift::markConfirmationNotificationSent);
            notified++;
        }

        return new WorkShiftNotifyResponse(storeId, req.getFrom(), req.getTo(), unconfirmed.size(), notified);
    }

    @Transactional
    public void delete(Long storeId, Long shiftId) {
        WorkShift shift = repository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("근무 일정을 찾을 수 없어요: " + shiftId));
        if (!shift.getStoreId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 근무 일정이 아니에요.");
        }
        repository.delete(shift);
    }

    /**
     * 시프트 시각 검증. 동일 시각은 0시간 근무라 거부.
     * 종료&lt;시작은 야간(익일 종료, 예 18:00~02:00)으로 허용한다 — 주류·심야 매장 대응.
     */
    private void validateShiftTimes(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("시작 시간과 종료 시간을 모두 입력해 주세요.");
        }
        if (startTime.equals(endTime)) {
            throw new IllegalArgumentException("시작 시간과 종료 시간이 같을 수 없어요.");
        }
    }

    private void assertActiveEmployeeInStore(Long employeeId, Long storeId) {
        if (!relationRepository.existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(employeeId, storeId)) {
            throw new AccessDeniedException("해당 매장에 소속된 직원이 아니에요.");
        }
    }

    private void validateNotifyRequest(WorkShiftNotifyRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("확정 알림 요청이 비어 있어요.");
        }
        validateRange(req.getFrom(), req.getTo());
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("조회 시작일과 종료일을 모두 입력해 주세요.");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("조회 시작일은 종료일보다 늦을 수 없어요.");
        }
    }

    private Optional<Long> findActiveEmployeeUserId(Long employeeId, Long storeId) {
        return relationRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(employeeId, storeId)
                .map(EmployeeStoreRelation::getEmployeeProfile)
                .flatMap(this::employeeUserId);
    }

    private Optional<Long> employeeUserId(EmployeeProfile profile) {
        if (profile.getUser() != null && profile.getUser().getId() != null) {
            return Optional.of(profile.getUser().getId());
        }
        return Optional.empty();
    }
}
