package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.ShiftSwapApplicant;
import com.rich.sodam.domain.ShiftSwapRequest;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.SwapRequestStatus;
import com.rich.sodam.dto.response.ShiftSwapRequestResponse;
import com.rich.sodam.dto.response.ShiftSwapRequestResponse.Applicant;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.ShiftSwapApplicantRepository;
import com.rich.sodam.repository.ShiftSwapRequestRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 대타 구하기(시프트 스왑) — 사장이 시프트를 대타 모집으로 전환하고, 매장 직원이 지원하며,
 * 사장이 승인하면 시프트가 승인자에게 재배정된다.
 *
 * <p>상태 전이: OPEN → FILLED(승인) / CANCELLED(취소). 시프트당 OPEN 모집은 1건만.
 * 매장 소유/소속 검증은 컨트롤러(StoreAccessGuard)에서 수행. 푸시 실패는 개별 격리 —
 * FCM 미설정(dev)이어도 모집·승인 자체는 성공해야 한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShiftSwapService {

    private final ShiftSwapRequestRepository swapRequestRepository;
    private final ShiftSwapApplicantRepository applicantRepository;
    private final WorkShiftRepository workShiftRepository;
    private final WorkShiftService workShiftService;
    private final EmployeeStoreRelationRepository relationRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /* ==================== 조회 헬퍼(컨트롤러 가드용) ==================== */

    @Transactional(readOnly = true)
    public Long storeIdOfShift(Long shiftId) {
        return findShift(shiftId).getStoreId();
    }

    @Transactional(readOnly = true)
    public Long storeIdOfRequest(Long requestId) {
        return findRequest(requestId).getStoreId();
    }

    /* ==================== 모집 생성(사장) ==================== */

    @Transactional
    public ShiftSwapRequestResponse create(Long shiftId) {
        WorkShift shift = findShift(shiftId);
        // 이미 지난 시프트는 대타 의미가 없다 — 400
        LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
        if (!shiftStart.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("이미 시작됐거나 지난 근무는 대타 모집을 만들 수 없어요.");
        }
        // 시프트당 OPEN 모집 1건 — 409
        if (swapRequestRepository.existsByShiftIdAndStatus(shiftId, SwapRequestStatus.OPEN)) {
            throw new ConflictException("이미 진행 중인 대타 모집이 있어요.");
        }

        ShiftSwapRequest request = swapRequestRepository.save(
                ShiftSwapRequest.open(shiftId, shift.getStoreId(), shift.getEmployeeId()));

        notifyRecruitmentOpened(shift);
        return ShiftSwapRequestResponse.of(request, shift, List.of());
    }

    /* ==================== 모집 목록(사장·직원 공용 — 소속 검증은 컨트롤러) ==================== */

    @Transactional(readOnly = true)
    public List<ShiftSwapRequestResponse> list(Long storeId, SwapRequestStatus status) {
        List<ShiftSwapRequest> requests = (status != null)
                ? swapRequestRepository.findByStoreIdAndStatusOrderByCreatedAtDesc(storeId, status)
                : swapRequestRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        if (requests.isEmpty()) {
            return List.of();
        }

        Map<Long, WorkShift> shiftsById = workShiftRepository
                .findAllById(requests.stream().map(ShiftSwapRequest::getShiftId).toList()).stream()
                .collect(Collectors.toMap(WorkShift::getId, Function.identity()));
        Map<Long, List<ShiftSwapApplicant>> applicantsByRequest = applicantRepository
                .findBySwapRequestIdIn(requests.stream().map(ShiftSwapRequest::getId).toList()).stream()
                .collect(Collectors.groupingBy(ShiftSwapApplicant::getSwapRequestId));
        Map<Long, String> namesById = userRepository
                .findAllById(applicantsByRequest.values().stream()
                        .flatMap(List::stream).map(ShiftSwapApplicant::getEmployeeId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, u -> u.getName() != null ? u.getName() : "직원"));

        return requests.stream()
                .map(req -> ShiftSwapRequestResponse.of(req, shiftsById.get(req.getShiftId()),
                        applicantsByRequest.getOrDefault(req.getId(), List.of()).stream()
                                .sorted(java.util.Comparator.comparing(ShiftSwapApplicant::getAppliedAt))
                                .map(a -> new Applicant(a.getEmployeeId(),
                                        namesById.getOrDefault(a.getEmployeeId(), "직원"), a.getAppliedAt()))
                                .toList()))
                .toList();
    }

    /* ==================== 지원(직원) ==================== */

    @Transactional
    public void apply(Long requestId, Long employeeId) {
        ShiftSwapRequest request = findRequest(requestId);
        if (!request.isOpen()) {
            throw new ConflictException("이미 마감된 대타 모집이에요.");
        }
        if (Objects.equals(employeeId, request.getOriginalEmployeeId())) {
            throw new IllegalArgumentException("본인이 배정된 근무에는 지원할 수 없어요.");
        }
        if (!relationRepository.existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(employeeId, request.getStoreId())) {
            throw new AccessDeniedException("해당 매장에 재직 중인 직원만 지원할 수 있어요.");
        }
        if (applicantRepository.existsBySwapRequestIdAndEmployeeId(requestId, employeeId)) {
            throw new ConflictException("이미 지원한 대타 모집이에요.");
        }
        applicantRepository.save(ShiftSwapApplicant.of(requestId, employeeId));
    }

    /* ==================== 승인(사장) — 시프트 재배정 + FILLED ==================== */

    @Transactional
    public ShiftSwapRequestResponse approve(Long requestId, Long employeeId) {
        ShiftSwapRequest request = findRequest(requestId);
        if (!request.isOpen()) {
            throw new ConflictException("이미 마감된 대타 모집이에요.");
        }
        if (!applicantRepository.existsBySwapRequestIdAndEmployeeId(requestId, employeeId)) {
            throw new IllegalArgumentException("이 모집에 지원하지 않은 직원은 승인할 수 없어요.");
        }

        // 기존 시프트 수정 서비스 재사용 — 매장 일관성·재직 검증 포함 재배정
        WorkShift shift = workShiftService.reassignEmployee(request.getStoreId(), request.getShiftId(), employeeId);
        request.fill(employeeId);

        notifyApprovalResults(request, shift, employeeId);
        return ShiftSwapRequestResponse.of(request, shift, applicantList(requestId));
    }

    /* ==================== 취소(사장) ==================== */

    @Transactional
    public void cancel(Long requestId) {
        ShiftSwapRequest request = findRequest(requestId);
        if (!request.isOpen()) {
            throw new ConflictException("이미 마감된 대타 모집이에요.");
        }
        request.cancel();
    }

    /* ==================== 내부 ==================== */

    private WorkShift findShift(Long shiftId) {
        return workShiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("근무 일정을 찾을 수 없어요: " + shiftId));
    }

    private ShiftSwapRequest findRequest(Long requestId) {
        return swapRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("대타 모집을 찾을 수 없어요: " + requestId));
    }

    private List<Applicant> applicantList(Long requestId) {
        List<ShiftSwapApplicant> applicants = applicantRepository.findBySwapRequestIdOrderByAppliedAtAsc(requestId);
        Map<Long, String> names = userRepository
                .findAllById(applicants.stream().map(ShiftSwapApplicant::getEmployeeId).toList()).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getName() != null ? u.getName() : "직원"));
        return applicants.stream()
                .map(a -> new Applicant(a.getEmployeeId(), names.getOrDefault(a.getEmployeeId(), "직원"), a.getAppliedAt()))
                .toList();
    }

    /** 모집 생성 알림 — 매장 전 재직 직원(원 배정자 제외)에게 푸시+인앱. */
    private void notifyRecruitmentOpened(WorkShift shift) {
        Store store = storeRepository.findById(shift.getStoreId()).orElse(null);
        String storeName = store != null && store.getStoreName() != null ? store.getStoreName() : "매장";
        PushMessage message = PushMessage.builder()
                .title("대타 모집")
                .body(String.format("대타 모집: %s %s~%s (%s). 가능한 분은 지원해 주세요!",
                        shift.getShiftDate(), shift.getStartTime(), shift.getEndTime(), storeName))
                .deepLink("sodam://shifts")
                .data(Map.of("type", "SHIFT_SWAP_OPEN", "storeId", String.valueOf(shift.getStoreId()),
                        "shiftId", String.valueOf(shift.getId())))
                .build();
        for (EmployeeStoreRelation rel : relationRepository.findByStoreAndIsActiveTrue(
                store != null ? store : storeRepository.getReferenceById(shift.getStoreId()))) {
            Long userId = rel.getEmployeeProfile().getUser() != null ? rel.getEmployeeProfile().getUser().getId() : null;
            if (userId == null || Objects.equals(rel.getEmployeeProfile().getId(), shift.getEmployeeId())) continue;
            try {
                notificationService.push(userId, message);
            } catch (Exception e) {
                log.warn("대타 모집 푸시 실패 userId={} reason={}", userId, e.getMessage());
            }
        }
    }

    /** 승인 알림 — 승인자에겐 "대타 확정", 탈락 지원자에겐 마감 알림. */
    private void notifyApprovalResults(ShiftSwapRequest request, WorkShift shift, Long approvedEmployeeId) {
        String timeLabel = String.format("%s %s~%s", shift.getShiftDate(), shift.getStartTime(), shift.getEndTime());
        try {
            notificationService.push(approvedEmployeeId, PushMessage.builder()
                    .title("대타 확정")
                    .body(String.format("%s 근무의 대타로 확정됐어요. 일정을 확인해 주세요.", timeLabel))
                    .deepLink("sodam://shifts")
                    .data(Map.of("type", "SHIFT_SWAP_APPROVED", "shiftId", String.valueOf(shift.getId())))
                    .build());
        } catch (Exception e) {
            log.warn("대타 확정 푸시 실패 userId={} reason={}", approvedEmployeeId, e.getMessage());
        }
        for (ShiftSwapApplicant applicant : applicantRepository.findBySwapRequestIdOrderByAppliedAtAsc(request.getId())) {
            if (Objects.equals(applicant.getEmployeeId(), approvedEmployeeId)) continue;
            try {
                notificationService.push(applicant.getEmployeeId(), PushMessage.builder()
                        .title("대타 모집 마감")
                        .body(String.format("%s 대타 모집이 마감됐어요. 지원해 주셔서 감사해요.", timeLabel))
                        .deepLink("sodam://shifts")
                        .data(Map.of("type", "SHIFT_SWAP_CLOSED", "shiftId", String.valueOf(shift.getId())))
                        .build());
            } catch (Exception e) {
                log.warn("대타 마감 푸시 실패 userId={} reason={}", applicant.getEmployeeId(), e.getMessage());
            }
        }
    }
}
