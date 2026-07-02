package com.rich.sodam.controller;

import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.dto.response.MyLeaveBalanceDto;
import com.rich.sodam.service.MyLeaveBalanceService;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.TimeOffService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@EmployeeOrMaster
@RestController
@RequestMapping("/api/timeoff")
public class TimeOffController {

    private final TimeOffService timeOffService;
    private final StoreAccessGuard guard;
    private final MyLeaveBalanceService myLeaveBalanceService;

    @Autowired
    public TimeOffController(TimeOffService timeOffService, StoreAccessGuard guard,
                            MyLeaveBalanceService myLeaveBalanceService) {
        this.timeOffService = timeOffService;
        this.guard = guard;
        this.myLeaveBalanceService = myLeaveBalanceService;
    }

    /**
     * 직원 본인 잔여 연차 조회 (E-NEW-03). 본인 전용 — principal.getId() 기준.
     */
    @GetMapping("/my/leave-balance")
    public ResponseEntity<MyLeaveBalanceDto> getMyLeaveBalance(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new IllegalStateException("로그인이 필요해요.");
        }
        return ResponseEntity.ok(myLeaveBalanceService.getMyLeaveBalance(principal.getId()));
    }

    /**
     * 직원 본인 휴가 셀프 신청 (PRD_EMPLOYEE).
     */
    @PostMapping("/self")
    public ResponseEntity<TimeOff> createSelfTimeOffRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.rich.sodam.dto.request.TimeOffSelfRequest body) {
        if (principal == null || principal.getId() == null) {
            throw new IllegalStateException("로그인이 필요해요.");
        }
        // 본인 매장 소속 검증
        guard.assertEmployeeInStore(principal.getId(), body.getStoreId());
        if (body.getStartDate().isAfter(body.getEndDate())) {
            throw new IllegalArgumentException("시작일은 종료일보다 빠르거나 같아야 해요.");
        }
        TimeOff timeOff = timeOffService.createTimeOffRequest(
                principal.getId(), body.getStoreId(), body.getStartDate(), body.getEndDate(), body.getReason());
        return ResponseEntity.ok(timeOff);
    }

    /**
     * 사장이 직원 휴가 직접 등록 (대리 신청).
     */
    @MasterOnly
    @PostMapping(params = {"employeeId", "storeId", "startDate", "endDate", "reason"})
    public ResponseEntity<TimeOff> createTimeOffRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long employeeId,
            @RequestParam Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam String reason) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        guard.assertEmployeeInStore(employeeId, storeId);
        TimeOff timeOff = timeOffService.createTimeOffRequest(employeeId, storeId, startDate, endDate, reason);
        return ResponseEntity.ok(timeOff);
    }

    /**
     * [Compat] RN 호환: JSON 본문 기반 휴가 신청 — 사장 대리 신청.
     */
    @MasterOnly
    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TimeOff> createTimeOffRequestJson(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.rich.sodam.dto.request.TimeOffCreateRequest body) {
        guard.assertMasterOwnsStore(principal.getId(), body.getStoreId());
        guard.assertEmployeeInStore(body.getEmployeeId(), body.getStoreId());
        TimeOff timeOff = timeOffService.createTimeOffRequest(
                body.getEmployeeId(), body.getStoreId(), body.getStartDate(), body.getEndDate(), body.getReason());
        return ResponseEntity.ok(timeOff);
    }

    /**
     * 특정 매장의 모든 휴가 신청 조회 — 사장 전용.
     */
    @MasterOnly
    @GetMapping("/store")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStore(storeId));
    }

    @MasterOnly
    @GetMapping("/store/status")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStoreAndStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long storeId,
            @RequestParam TimeOffStatus status) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStoreAndStatus(storeId, status));
    }

    /**
     * 특정 직원의 모든 휴가 신청 조회 — 본인 또는 그 직원의 매장 사장.
     */
    @GetMapping("/employee")
    public ResponseEntity<List<TimeOff>> getTimeOffsByEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long employeeId) {
        guard.assertCanViewEmployee(principal.getId(), employeeId, hasMasterRole(principal));
        return ResponseEntity.ok(timeOffService.getTimeOffsByEmployee(employeeId));
    }

    // [Compat] RN 경로 호환
    @MasterOnly
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStoreCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStore(storeId));
    }

    @MasterOnly
    @GetMapping("/store/{storeId}/status/{status}")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStoreAndStatusCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable TimeOffStatus status) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStoreAndStatus(storeId, status));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<TimeOff>> getTimeOffsByEmployeeCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long employeeId) {
        guard.assertCanViewEmployee(principal.getId(), employeeId, hasMasterRole(principal));
        return ResponseEntity.ok(timeOffService.getTimeOffsByEmployee(employeeId));
    }

    /**
     * 휴가 신청 승인 — 사장 전용 + 매장 ownership check.
     */
    @MasterOnly
    @PutMapping("/{timeOffId}/approve")
    public ResponseEntity<TimeOff> approveTimeOff(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long timeOffId) {
        guard.assertMasterOwnsTimeOff(principal.getId(), timeOffId);
        return ResponseEntity.ok(timeOffService.approveTimeOffRequest(timeOffId));
    }

    /**
     * 휴가 신청 거부 — 사장 전용 + 매장 ownership check.
     */
    @MasterOnly
    @PutMapping("/{timeOffId}/reject")
    public ResponseEntity<TimeOff> rejectTimeOff(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long timeOffId) {
        guard.assertMasterOwnsTimeOff(principal.getId(), timeOffId);
        return ResponseEntity.ok(timeOffService.rejectTimeOffRequest(timeOffId));
    }

    private static boolean hasMasterRole(UserPrincipal principal) {
        if (principal == null || principal.getAuthorities() == null) return false;
        return principal.getAuthorities().stream().anyMatch(a -> {
            String r = a.getAuthority();
            return "ROLE_MASTER".equals(r) || "ROLE_MANAGER".equals(r) || "ROLE_BOSS".equals(r);
        });
    }
}
