package com.rich.sodam.controller;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceCorrectionRequest;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceCorrectionRequestRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.NotificationService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.annotation.EmployeeOrMaster;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 출퇴근 정정 요청 워크플로 (직원 → 사장 승인).
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@Tag(name = "출퇴근 관리", description = "출퇴근 정정 요청")
public class AttendanceCorrectionController {

    private final AttendanceCorrectionRequestRepository correctionRepo;
    private final AttendanceRepository attendanceRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;
    private final StoreAccessGuard storeAccessGuard;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CorrectionRequest {
        private LocalDateTime proposedCheckIn;
        private LocalDateTime proposedCheckOut;
        @NotBlank @Size(min = 5, max = 200)
        private String reason;
    }

    @Operation(summary = "출퇴근 정정 요청 (직원)")
    @PostMapping("/{attendanceId}/correction-request")
    @Transactional
    public ResponseEntity<Map<String, Object>> requestCorrection(
            @PathVariable Long attendanceId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CorrectionRequest body) {
        Attendance attendance = attendanceRepo.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("출퇴근 기록을 찾을 수 없어요."));
        User requester = userRepo.findById(principal.getId())
                .orElseThrow();
        // 본인 기록인지 확인
        if (attendance.getEmployeeProfile() == null
                || attendance.getEmployeeProfile().getUser() == null
                || !attendance.getEmployeeProfile().getUser().getId().equals(principal.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "본인 기록만 정정 요청할 수 있어요."));
        }
        AttendanceCorrectionRequest req = correctionRepo.save(
                AttendanceCorrectionRequest.create(
                        attendance, requester,
                        body.getProposedCheckIn(), body.getProposedCheckOut(),
                        body.getReason()));

        // 사장에게 알림 — 매장 기준 (단순화: 별도 알림 메시지)
        // TODO[P2]: 사장 매장 관계 조회 후 모든 사장에게 발송
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", req.getId());
        res.put("status", req.getStatus().name());
        return ResponseEntity.ok(res);
    }

    @Operation(summary = "내 정정 요청 이력 조회")
    @GetMapping("/correction-requests/me")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> myCorrections(
            @AuthenticationPrincipal UserPrincipal principal) {
        var items = correctionRepo.findByRequester_IdOrderByRequestedAtDesc(principal.getId())
                .stream().map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("attendanceId", r.getAttendance() != null ? r.getAttendance().getId() : null);
                    m.put("proposedCheckIn", r.getProposedCheckIn());
                    m.put("proposedCheckOut", r.getProposedCheckOut());
                    m.put("reason", r.getReason());
                    m.put("status", r.getStatus().name());
                    m.put("rejectReason", r.getRejectReason());
                    m.put("requestedAt", r.getRequestedAt());
                    m.put("decidedAt", r.getDecidedAt());
                    return m;
                }).toList();
        return ResponseEntity.ok(items);
    }

    @Operation(summary = "정정 요청 승인 (사장)",
            description = "Attendance.adjustTimes 로 출퇴근 시간을 실제로 갱신하고 요청자에게 알림 발송.")
    @MasterOnly
    @PostMapping("/correction-requests/{id}/approve")
    @Transactional
    public ResponseEntity<Map<String, String>> approve(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        AttendanceCorrectionRequest req = correctionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없어요."));

        Attendance att = req.getAttendance();
        // BOLA 차단: 정정 대상 출퇴근이 속한 매장의 사장만 승인(임금 조작 방지)
        if (att == null || att.getStore() == null) {
            throw new IllegalArgumentException("정정 대상 매장을 확인할 수 없어요.");
        }
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), att.getStore().getId());
        if (req.getProposedCheckIn() != null) {
            att.adjustTimes(req.getProposedCheckIn(), req.getProposedCheckOut());
            attendanceRepo.save(att);
        }
        req.approve();

        if (req.getRequester() != null) {
            notificationService.push(req.getRequester().getId(),
                    com.rich.sodam.config.integration.PushNotifier.PushMessage.builder()
                            .title("정정 요청이 승인됐어요")
                            .body("사장님이 정정 요청을 승인했어요. 출퇴근 기록이 업데이트됐어요.")
                            .deepLink("sodam://attendance")
                            .data(Map.of("type", "ATTENDANCE_CORRECTION_APPROVED"))
                            .build());
        }
        return ResponseEntity.ok(Map.of("message", "승인되었어요."));
    }

    @Operation(summary = "정정 요청 거절 (사장)")
    @MasterOnly
    @PostMapping("/correction-requests/{id}/reject")
    @Transactional
    public ResponseEntity<Map<String, String>> reject(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String reason) {
        AttendanceCorrectionRequest req = correctionRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없어요."));
        // BOLA 차단: 정정 대상 매장의 사장만 거절
        if (req.getAttendance() == null || req.getAttendance().getStore() == null) {
            throw new IllegalArgumentException("정정 대상 매장을 확인할 수 없어요.");
        }
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), req.getAttendance().getStore().getId());
        req.reject(reason);

        if (req.getRequester() != null) {
            notificationService.push(req.getRequester().getId(),
                    com.rich.sodam.config.integration.PushNotifier.PushMessage.builder()
                            .title("정정 요청이 거절됐어요")
                            .body(reason != null && !reason.isBlank()
                                    ? "사유: " + reason
                                    : "사장님이 정정 요청을 거절했어요. 사장님께 직접 확인해 보세요.")
                            .deepLink("sodam://attendance")
                            .data(Map.of("type", "ATTENDANCE_CORRECTION_REJECTED"))
                            .build());
        }
        return ResponseEntity.ok(Map.of("message", "거절했어요."));
    }
}
