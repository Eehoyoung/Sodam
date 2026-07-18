package com.rich.sodam.controller;

import com.rich.sodam.domain.AttendanceApprovalRequest.Status;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.dto.request.AttendanceApprovalCreateRequest;
import com.rich.sodam.dto.response.AttendanceApprovalResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.AttendanceApprovalService;
import com.rich.sodam.service.AttendanceApprovalService.AttendanceApprovalResponseHolder;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.ManagerSupervisionNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 사장 승인 출퇴근 API (위치/NFC 없이 사장 승인으로 출퇴근).
 *
 * <p>직원: 요청 생성·내 이력 조회. 사장: 매장 대기목록 조회·승인·거절(@MasterOnly + 매장 소유 가드).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "사장 승인 출퇴근", description = "위치/NFC 없이 사장 승인으로 출퇴근 처리")
public class AttendanceApprovalController {

    private final AttendanceApprovalService service;
    private final StoreAccessGuard storeAccessGuard;
    private final ManagerSupervisionNotificationService supervision;

    private static AttendanceApprovalResponse toDto(AttendanceApprovalResponseHolder h) {
        return AttendanceApprovalResponse.of(h.request(), h.employeeName());
    }

    @EmployeeOrMaster
    @Operation(summary = "승인 출퇴근 요청 (직원)", description = "요청 시각=서버시각. 사장에게 알림 발송.")
    @PostMapping("/api/attendance/approval-requests")
    public ResponseEntity<AttendanceApprovalResponse> request(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AttendanceApprovalCreateRequest req) {
        return ResponseEntity.ok(toDto(
                service.request(principal.getId(), req.getStoreId(), req.getType())));
    }

    @EmployeeOrMaster
    @Operation(summary = "내 승인 요청 이력 (직원)")
    @GetMapping("/api/attendance/approval-requests/mine")
    public ResponseEntity<List<AttendanceApprovalResponse>> mine(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.listMine(principal.getId()).stream()
                .map(AttendanceApprovalController::toDto).toList());
    }

    @EmployeeOrMaster
    @Operation(summary = "매장 승인 요청 목록 (사장)", description = "기본 PENDING. 매장 소유 검증.")
    @GetMapping("/api/stores/{storeId}/approval-requests")
    public ResponseEntity<List<AttendanceApprovalResponse>> listForStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "PENDING") Status status) {
        storeAccessGuard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        return ResponseEntity.ok(service.listForStore(storeId, status).stream()
                .map(AttendanceApprovalController::toDto).toList());
    }

    @EmployeeOrMaster
    @Operation(summary = "승인 (사장)", description = "요청 시각으로 출퇴근 기록 + 직원에게 알림.")
    @PostMapping("/api/attendance/approval-requests/{id}/approve")
    public ResponseEntity<AttendanceApprovalResponse> approve(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Long storeId = service.storeIdOf(id);
        storeAccessGuard.assertMasterOrManagerPermission(
                principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        AttendanceApprovalResponse response = toDto(service.approve(id));
        supervision.notifyIfManager(principal.getId(), storeId, "출퇴근 승인");
        return ResponseEntity.ok(response);
    }

    @EmployeeOrMaster
    @Operation(summary = "거절 (사장)")
    @PostMapping("/api/attendance/approval-requests/{id}/reject")
    public ResponseEntity<AttendanceApprovalResponse> reject(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String reason) {
        Long storeId = service.storeIdOf(id);
        storeAccessGuard.assertMasterOrManagerPermission(
                principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        AttendanceApprovalResponse response = toDto(service.reject(id, reason));
        supervision.notifyIfManager(principal.getId(), storeId, "출퇴근 요청 거절");
        return ResponseEntity.ok(response);
    }
}
