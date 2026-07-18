package com.rich.sodam.controller;

import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.dto.request.TimeOffRejectRequest;
import com.rich.sodam.dto.response.TimeOffResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.dto.response.MyLeaveBalanceDto;
import com.rich.sodam.service.MyLeaveBalanceService;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.ManagerSupervisionNotificationService;
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
    private final ManagerSupervisionNotificationService supervision;
    private final MyLeaveBalanceService myLeaveBalanceService;

    @Autowired
    public TimeOffController(TimeOffService timeOffService, StoreAccessGuard guard,
                            MyLeaveBalanceService myLeaveBalanceService,
                            ManagerSupervisionNotificationService supervision) {
        this.timeOffService = timeOffService;
        this.guard = guard;
        this.myLeaveBalanceService = myLeaveBalanceService;
        this.supervision = supervision;
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
     * 직원 본인 휴가 셀프 신청 (PRD_EMPLOYEE). leaveType/unit 생략 시 ANNUAL/FULL_DAY.
     */
    @PostMapping("/self")
    public ResponseEntity<TimeOffResponse> createSelfTimeOffRequest(
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
        TimeOffResponse response = timeOffService.createTimeOffRequest(
                principal.getId(), body.getStoreId(), body.getLeaveType(), body.getUnit(),
                body.getStartDate(), body.getEndDate(), body.getStartTime(), body.getEndTime(), body.getReason());
        return ResponseEntity.ok(response);
    }

    /**
     * 사장이 직원 휴가 직접 등록 (대리 신청).
     */
    @MasterOnly
    @PostMapping(params = {"employeeId", "storeId", "startDate", "endDate", "reason"})
    public ResponseEntity<TimeOffResponse> createTimeOffRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long employeeId,
            @RequestParam Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam String reason) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        guard.assertEmployeeInStore(employeeId, storeId);
        TimeOffResponse response = timeOffService.createTimeOffRequest(employeeId, storeId, startDate, endDate, reason);
        return ResponseEntity.ok(response);
    }

    /**
     * [Compat] RN 호환: JSON 본문 기반 휴가 신청 — 사장 대리 신청.
     */
    @MasterOnly
    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TimeOffResponse> createTimeOffRequestJson(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.rich.sodam.dto.request.TimeOffCreateRequest body) {
        guard.assertMasterOwnsStore(principal.getId(), body.getStoreId());
        guard.assertEmployeeInStore(body.getEmployeeId(), body.getStoreId());
        TimeOffResponse response = timeOffService.createTimeOffRequest(
                body.getEmployeeId(), body.getStoreId(), body.getLeaveType(), body.getUnit(),
                body.getStartDate(), body.getEndDate(), body.getStartTime(), body.getEndTime(), body.getReason());
        return ResponseEntity.ok(response);
    }

    /**
     * 특정 매장의 모든 휴가 신청 조회 — 사장 전용.
     */
    @EmployeeOrMaster
    @GetMapping("/store")
    public ResponseEntity<List<TimeOffResponse>> getTimeOffsByStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long storeId) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.TIMEOFF_APPROVE);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStore(storeId));
    }

    @EmployeeOrMaster
    @GetMapping("/store/status")
    public ResponseEntity<List<TimeOffResponse>> getTimeOffsByStoreAndStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long storeId,
            @RequestParam TimeOffStatus status) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.TIMEOFF_APPROVE);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStoreAndStatus(storeId, status));
    }

    /**
     * 특정 직원의 모든 휴가 신청 조회 — 본인 또는 그 직원의 매장 사장.
     */
    @GetMapping("/employee")
    public ResponseEntity<List<TimeOffResponse>> getTimeOffsByEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam Long employeeId) {
        guard.assertSelf(principal.getId(), employeeId);
        return ResponseEntity.ok(timeOffService.getTimeOffResponsesByEmployee(employeeId));
    }

    // [Compat] RN 경로 호환
    @EmployeeOrMaster
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<TimeOffResponse>> getTimeOffsByStoreCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.TIMEOFF_APPROVE);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStore(storeId));
    }

    @EmployeeOrMaster
    @GetMapping("/store/{storeId}/status/{status}")
    public ResponseEntity<List<TimeOffResponse>> getTimeOffsByStoreAndStatusCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable TimeOffStatus status) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.TIMEOFF_APPROVE);
        return ResponseEntity.ok(timeOffService.getTimeOffsByStoreAndStatus(storeId, status));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<TimeOffResponse>> getTimeOffsByEmployeeCompat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long employeeId) {
        guard.assertSelf(principal.getId(), employeeId);
        return ResponseEntity.ok(timeOffService.getTimeOffResponsesByEmployee(employeeId));
    }

    /**
     * 휴가 신청 승인 — 사장 전용 + 매장 ownership check. leaveType=ANNUAL 이면 잔여 연차 재검증.
     */
    @EmployeeOrMaster
    @PutMapping("/{timeOffId}/approve")
    public ResponseEntity<TimeOffResponse> approveTimeOff(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long timeOffId) {
        guard.assertMasterOrManagerOwnsTimeOff(principal.getId(), timeOffId, ManagerPermission.TIMEOFF_APPROVE);
        TimeOffResponse response = timeOffService.approveTimeOffRequest(timeOffId);
        supervision.notifyIfManager(principal.getId(), response.storeId(), "휴가 승인");
        return ResponseEntity.ok(response);
    }

    /**
     * 휴가 신청 거부 — 사장 전용 + 매장 ownership check. 사유(reason) 필수
     * (§60⑤ 시기변경권이 유일한 법적 거부 근거 — 사유 입력을 강제해 이 요건을 유도).
     */
    @EmployeeOrMaster
    @PutMapping("/{timeOffId}/reject")
    public ResponseEntity<TimeOffResponse> rejectTimeOff(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long timeOffId,
            @Valid @RequestBody TimeOffRejectRequest body) {
        guard.assertMasterOrManagerOwnsTimeOff(principal.getId(), timeOffId, ManagerPermission.TIMEOFF_APPROVE);
        TimeOffResponse response = timeOffService.rejectTimeOffRequest(timeOffId, body.getReason());
        supervision.notifyIfManager(principal.getId(), response.storeId(), "휴가 거절");
        return ResponseEntity.ok(response);
    }

}
