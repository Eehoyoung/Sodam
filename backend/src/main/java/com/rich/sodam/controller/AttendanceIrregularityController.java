package com.rich.sodam.controller;

import com.rich.sodam.domain.AttendanceIrregularity;
import com.rich.sodam.domain.AttendanceNotice;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.AttendanceIrregularityResolveRequest;
import com.rich.sodam.dto.request.AttendanceNoticeCreateRequest;
import com.rich.sodam.dto.response.AttendanceIrregularityResponse;
import com.rich.sodam.dto.response.AttendanceNoticeResponse;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.AttendanceIrregularityService;
import com.rich.sodam.service.AttendanceNoticeService;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.ManagerSupervisionNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 월급제 정규직 지각/조퇴/결근 — 자동 감지 조회, 사장 확정(공제/공제안함/연차전환), 직원 사전 신고.
 */
@Tag(name = "근태 이상(지각/조퇴/결근)")
@EmployeeOrMaster
@RestController
@RequiredArgsConstructor
public class AttendanceIrregularityController {

    private final AttendanceIrregularityService irregularityService;
    private final AttendanceNoticeService noticeService;
    private final StoreAuthorizationPolicy guard;
    private final UserRepository userRepository;
    private final ManagerSupervisionNotificationService supervision;

    @Operation(summary = "매장의 근태 이상 목록 조회(자동 감지 포함) — 사장 전용")
    @EmployeeOrMaster
    @GetMapping("/api/stores/{storeId}/attendance-irregularities")
    public ResponseEntity<List<AttendanceIrregularityResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        List<AttendanceIrregularity> items = irregularityService.listForStore(storeId, from, to);
        return ResponseEntity.ok(toResponses(items));
    }

    @Operation(summary = "근태 이상 공제 없이 처리 — 사장 전용")
    @EmployeeOrMaster
    @PostMapping("/api/stores/{storeId}/attendance-irregularities/{id}/waive")
    public ResponseEntity<AttendanceIrregularityResponse> waive(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id,
            @RequestBody(required = false) AttendanceIrregularityResolveRequest body) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        AttendanceIrregularity a = irregularityService.waive(id, storeId, principal.getId(), note(body));
        supervision.notifyIfManager(principal.getId(), storeId, "근태 이상 공제 면제");
        return ResponseEntity.ok(toResponse(a));
    }

    @Operation(summary = "근태 이상 공제 확정(통상시급 기준) — 사장 전용")
    @EmployeeOrMaster
    @PostMapping("/api/stores/{storeId}/attendance-irregularities/{id}/deduct")
    public ResponseEntity<AttendanceIrregularityResponse> deduct(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id,
            @RequestBody(required = false) AttendanceIrregularityResolveRequest body) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        AttendanceIrregularity a = irregularityService.deduct(id, storeId, principal.getId(), note(body));
        supervision.notifyIfManager(principal.getId(), storeId, "근태 이상 공제 확정");
        return ResponseEntity.ok(toResponse(a));
    }

    @Operation(summary = "근태 이상 연차(반차/종일) 전환 — 사장 전용")
    @EmployeeOrMaster
    @PostMapping("/api/stores/{storeId}/attendance-irregularities/{id}/convert-to-leave")
    public ResponseEntity<AttendanceIrregularityResponse> convertToLeave(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id,
            @RequestBody(required = false) AttendanceIrregularityResolveRequest body) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.ATTENDANCE_APPROVE);
        AttendanceIrregularity a = irregularityService.convertToLeave(id, storeId, principal.getId(), note(body));
        supervision.notifyIfManager(principal.getId(), storeId, "근태 이상 연차 전환");
        return ResponseEntity.ok(toResponse(a));
    }

    @Operation(summary = "직원 본인의 처리된 근태 이상 내역 조회")
    @GetMapping("/api/attendance-irregularities/my")
    public ResponseEntity<List<AttendanceIrregularityResponse>> myResolved(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long storeId) {
        guard.assertEmployeeInStore(principal.getId(), storeId);
        List<AttendanceIrregularity> items = irregularityService.listResolvedForEmployee(principal.getId(), storeId);
        return ResponseEntity.ok(toResponses(items));
    }

    @Operation(summary = "직원 본인의 지각/조퇴/결근 사전 신고 — 임금에는 영향을 주지 않고 사장에게만 알림")
    @PostMapping("/api/stores/{storeId}/attendance-notices")
    public ResponseEntity<AttendanceNoticeResponse> createNotice(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody AttendanceNoticeCreateRequest body) {
        guard.assertEmployeeInStore(principal.getId(), storeId);
        AttendanceNotice notice = noticeService.create(
                principal.getId(), storeId, body.getForDate(), body.getType(), body.getMessage());
        return ResponseEntity.ok(AttendanceNoticeResponse.of(notice));
    }

    private static String note(AttendanceIrregularityResolveRequest body) {
        return body != null ? body.getNote() : null;
    }

    private List<AttendanceIrregularityResponse> toResponses(List<AttendanceIrregularity> items) {
        Map<Long, String> names = userRepository.findAllById(items.stream().map(AttendanceIrregularity::getEmployeeId).distinct().toList())
                .stream().collect(java.util.stream.Collectors.toMap(User::getId, User::getName));
        return items.stream().map(a -> AttendanceIrregularityResponse.of(a, names.get(a.getEmployeeId()))).toList();
    }

    private AttendanceIrregularityResponse toResponse(AttendanceIrregularity a) {
        String name = userRepository.findById(a.getEmployeeId()).map(User::getName).orElse(null);
        return AttendanceIrregularityResponse.of(a, name);
    }
}
