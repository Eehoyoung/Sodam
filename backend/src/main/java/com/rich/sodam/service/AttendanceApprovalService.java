package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceApprovalRequest;
import com.rich.sodam.domain.AttendanceApprovalRequest.Status;
import com.rich.sodam.domain.AttendanceApprovalRequest.Type;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceApprovalRequestRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 사장 승인 출퇴근 워크플로 (위치/NFC 없이 사장 승인으로 출퇴근).
 *
 * <p>직원 요청 → 사장에게 알림 → 사장 승인 시 요청 시각으로 출퇴근 기록(요청 시각 보존) → 직원에게 알림.
 * 매장 소유/소속 검증은 컨트롤러(가드)에서, 여기서는 도메인 일관성·상태전이만 담당.
 */
@Service
@RequiredArgsConstructor
public class AttendanceApprovalService {

    private final AttendanceApprovalRequestRepository repository;
    private final AttendanceService attendanceService;
    private final EmployeeStoreRelationRepository relationRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final NotificationService notificationService;
    private final StorePermissionRecipientService permissionRecipients;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final LiveSyncPublisher liveSyncPublisher;

    /** 직원이 사장 승인 출/퇴근을 요청. 요청 시각 = 서버시각(과거 위조 방지). */
    @Transactional
    public AttendanceApprovalResponseHolder request(Long employeeId, Long storeId, Type type) {
        if (!relationRepository.existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(employeeId, storeId)) {
            throw new AccessDeniedException("해당 매장에 소속된 직원이 아니에요.");
        }
        if (repository.existsByEmployeeIdAndStoreIdAndTypeAndStatus(employeeId, storeId, type, Status.PENDING)) {
            throw new IllegalStateException(type == Type.CHECK_IN
                    ? "이미 출근 승인 요청이 대기 중이에요."
                    : "이미 퇴근 승인 요청이 대기 중이에요.");
        }

        AttendanceApprovalRequest saved = repository.save(
                AttendanceApprovalRequest.create(employeeId, storeId, type, LocalDateTime.now()));

        notifyMasters(employeeId, storeId, type);
        return new AttendanceApprovalResponseHolder(saved, employeeName(employeeId));
    }

    @Transactional(readOnly = true)
    public List<AttendanceApprovalResponseHolder> listForStore(Long storeId, Status status) {
        return repository.findByStoreIdAndStatusOrderByRequestedAtDesc(storeId, status).stream()
                .map(r -> new AttendanceApprovalResponseHolder(r, employeeName(r.getEmployeeId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceApprovalResponseHolder> listMine(Long employeeId) {
        return repository.findByEmployeeIdOrderByRequestedAtDesc(employeeId).stream()
                .map(r -> new AttendanceApprovalResponseHolder(r, employeeName(r.getEmployeeId())))
                .toList();
    }

    /**
     * 사장 승인 — 요청 시각으로 출퇴근을 실제 기록한다(위치 null).
     * CHECK_IN: manualCheckIn(requestedTime), CHECK_OUT: manualCheckOut(requestedTime).
     */
    @Transactional
    public AttendanceApprovalResponseHolder approve(Long id) {
        AttendanceApprovalRequest req = findRequest(id);
        if (!req.isPending()) {
            throw new IllegalStateException("이미 처리된 요청이에요.");
        }

        Attendance attendance = req.getType() == Type.CHECK_IN
                ? attendanceService.checkIn(req.getEmployeeId(), req.getStoreId(), null, null, req.getRequestedTime())
                : attendanceService.checkOut(req.getEmployeeId(), req.getStoreId(), null, null, req.getRequestedTime());

        req.approve(attendance.getId());

        // 사장 대시보드·직원 홈 라이브 동기화 (checkIn/checkOut 비검증 경로는 자체 발행이 없음)
        liveSyncPublisher.publishStore(req.getStoreId(), LiveSyncPublisher.SyncType.ATTENDANCE_CHANGED);

        notifyEmployeeDecision(req, true, null);
        return new AttendanceApprovalResponseHolder(req, employeeName(req.getEmployeeId()));
    }

    @Transactional
    public AttendanceApprovalResponseHolder reject(Long id, String reason) {
        AttendanceApprovalRequest req = findRequest(id);
        if (!req.isPending()) {
            throw new IllegalStateException("이미 처리된 요청이에요.");
        }
        req.reject(reason);
        notifyEmployeeDecision(req, false, reason);
        return new AttendanceApprovalResponseHolder(req, employeeName(req.getEmployeeId()));
    }

    /** 컨트롤러 가드(매장 소유 검증)용 — 요청의 매장 id 조회. */
    @Transactional(readOnly = true)
    public Long storeIdOf(Long requestId) {
        return findRequest(requestId).getStoreId();
    }

    private AttendanceApprovalRequest findRequest(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("승인 요청을 찾을 수 없어요: " + id));
    }

    private void notifyMasters(Long employeeId, Long storeId, Type type) {
        String empName = employeeName(employeeId);
        String storeName = storeRepository.findById(storeId)
                .map(s -> s.getStoreName() != null ? s.getStoreName() : "매장").orElse("매장");
        String verb = type == Type.CHECK_IN ? "출근" : "퇴근";
        for (Long recipientUserId : permissionRecipients.ownersAndManagers(
                storeId, com.rich.sodam.domain.type.ManagerPermission.ATTENDANCE_APPROVE)) {
            notificationService.push(recipientUserId, PushMessage.builder()
                    .title(verb + " 승인 요청")
                    .body(String.format("%s님이 %s 처리를 요청했어요. (%s)", empName, verb, storeName))
                    .deepLink("sodam://attendance/approvals")
                    .data(Map.of("type", "ATTENDANCE_APPROVAL_REQUESTED"))
                    .build());
        }
    }

    private void notifyEmployeeDecision(AttendanceApprovalRequest req, boolean approved, String reason) {
        String verb = req.getType() == Type.CHECK_IN ? "출근" : "퇴근";
        PushMessage msg = approved
                ? PushMessage.builder()
                .title(verb + " 승인됨")
                .body(String.format("사장님이 %s 요청을 승인했어요. 요청한 시각으로 처리됐어요.", verb))
                .deepLink("sodam://attendance")
                .data(Map.of("type", "ATTENDANCE_APPROVAL_APPROVED"))
                .build()
                : PushMessage.builder()
                .title(verb + " 요청 거절됨")
                .body(reason != null && !reason.isBlank() ? "사유: " + reason
                        : String.format("사장님이 %s 요청을 거절했어요. 사장님께 확인해 보세요.", verb))
                .deepLink("sodam://attendance")
                .data(Map.of("type", "ATTENDANCE_APPROVAL_REJECTED"))
                .build();
        notificationService.push(req.getEmployeeId(), msg);
    }

    private String employeeName(Long employeeId) {
        return userRepository.findById(employeeId)
                .map(User::getName)
                .filter(n -> n != null && !n.isBlank())
                .orElse("직원");
    }

    /** 응답 변환은 컨트롤러에서 — 서비스는 엔티티+이름만 전달(record 의존 최소화). */
    public record AttendanceApprovalResponseHolder(AttendanceApprovalRequest request, String employeeName) {
    }
}
