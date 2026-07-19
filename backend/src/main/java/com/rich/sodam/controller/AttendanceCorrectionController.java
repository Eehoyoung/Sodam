package com.rich.sodam.controller;

import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.AttendanceCorrectionService;
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

    private final AttendanceCorrectionService correctionService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CorrectionRequest {
        private LocalDateTime proposedCheckIn;
        private LocalDateTime proposedCheckOut;
        @NotBlank @Size(min = 5, max = 200)
        private String reason;
    }

    @Operation(summary = "출퇴근 정정 요청 (직원)")
    @PostMapping("/{attendanceId}/correction-request")
    public ResponseEntity<Map<String, Object>> requestCorrection(
            @PathVariable Long attendanceId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CorrectionRequest body) {
        AttendanceCorrectionService.CorrectionRequestResult result = correctionService.requestCorrection(
                attendanceId, principal.getId(),
                body.getProposedCheckIn(), body.getProposedCheckOut(), body.getReason());
        if (result.forbidden()) {
            return ResponseEntity.status(403).body(Map.of("message", "본인 기록만 정정 요청할 수 있어요."));
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", result.id());
        res.put("status", result.status());
        return ResponseEntity.ok(res);
    }

    @Operation(summary = "내 정정 요청 이력 조회")
    @GetMapping("/correction-requests/me")
    public ResponseEntity<List<Map<String, Object>>> myCorrections(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(correctionService.myCorrections(principal.getId()));
    }

    @Operation(summary = "정정 요청 승인 (사장)",
            description = "Attendance.adjustTimes 로 출퇴근 시간을 실제로 갱신하고 요청자에게 알림 발송.")
    @EmployeeOrMaster
    @PostMapping("/correction-requests/{id}/approve")
    public ResponseEntity<Map<String, String>> approve(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        // BOLA 차단: 정정 대상 출퇴근이 속한 매장의 사장만 승인(임금 조작 방지)
        Long storeId = correctionService.resolveStoreIdForCorrectionRequest(id);
        storeAccessGuard.assertMasterOrManagerPermission(
                principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        correctionService.approve(id, principal.getId());
        return ResponseEntity.ok(Map.of("message", "승인되었어요."));
    }

    @Operation(summary = "정정 요청 거절 (사장)")
    @EmployeeOrMaster
    @PostMapping("/correction-requests/{id}/reject")
    public ResponseEntity<Map<String, String>> reject(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String reason) {
        // BOLA 차단: 정정 대상 매장의 사장만 거절
        Long storeId = correctionService.resolveStoreIdForCorrectionRequest(id);
        storeAccessGuard.assertMasterOrManagerPermission(
                principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        correctionService.reject(id, principal.getId(), reason);
        return ResponseEntity.ok(Map.of("message", "거절했어요."));
    }
}
