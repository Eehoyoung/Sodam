package com.rich.sodam.controller;

import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.service.TimeOffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/timeoff")
public class TimeOffController {

    private final TimeOffService timeOffService;

    @Autowired
    public TimeOffController(TimeOffService timeOffService) {
        this.timeOffService = timeOffService;
    }

    /**
     * 직원 본인 휴가 셀프 신청 (PRD_EMPLOYEE).
     * 매장 ID 만 지정 + 인증된 사용자 본인을 employee 로 사용.
     */
    @PostMapping("/self")
    public ResponseEntity<TimeOff> createSelfTimeOffRequest(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal,
            @jakarta.validation.Valid @RequestBody com.rich.sodam.dto.request.TimeOffSelfRequest body) {
        if (principal == null || principal.getId() == null) {
            // 인증 정보가 비어있는 경우 — JWT 필터가 컨텍스트 셋팅 못한 케이스.
            throw new IllegalStateException("로그인이 필요해요.");
        }
        // 시작일 ≤ 종료일 가드 (도메인 정합성)
        if (body.getStartDate().isAfter(body.getEndDate())) {
            throw new IllegalArgumentException("시작일은 종료일보다 빠르거나 같아야 해요.");
        }
        TimeOff timeOff = timeOffService.createTimeOffRequest(
                principal.getId(), body.getStoreId(), body.getStartDate(), body.getEndDate(), body.getReason());
        return ResponseEntity.ok(timeOff);
    }

    /**
     * 휴가 신청 생성 (쿼리 파라미터 기반)
     */
    @PostMapping(params = {"employeeId", "storeId", "startDate", "endDate", "reason"})
    public ResponseEntity<TimeOff> createTimeOffRequest(
            @RequestParam Long employeeId,
            @RequestParam Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam String reason) {

        TimeOff timeOff = timeOffService.createTimeOffRequest(employeeId, storeId, startDate, endDate, reason);
        return ResponseEntity.ok(timeOff);
    }

    /**
     * [Compat] RN 호환: JSON 본문 기반 휴가 신청 생성
     */
    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TimeOff> createTimeOffRequestJson(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.rich.sodam.dto.request.TimeOffCreateRequest body) {
        TimeOff timeOff = timeOffService.createTimeOffRequest(
                body.getEmployeeId(), body.getStoreId(), body.getStartDate(), body.getEndDate(), body.getReason());
        return ResponseEntity.ok(timeOff);
    }

    /**
     * 특정 매장의 모든 휴가 신청 조회
     */
    @GetMapping("/store")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStore(@RequestParam Long storeId) {
        List<TimeOff> timeOffs = timeOffService.getTimeOffsByStore(storeId);
        return ResponseEntity.ok(timeOffs);
    }

    /**
     * 특정 매장의 특정 상태의 휴가 신청 조회
     */
    @GetMapping("/store/status")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStoreAndStatus(
            @RequestParam Long storeId,
            @RequestParam TimeOffStatus status) {

        List<TimeOff> timeOffs = timeOffService.getTimeOffsByStoreAndStatus(storeId, status);
        return ResponseEntity.ok(timeOffs);
    }

    /**
     * 특정 직원의 모든 휴가 신청 조회
     */
    @GetMapping("/employee")
    public ResponseEntity<List<TimeOff>> getTimeOffsByEmployee(@RequestParam Long employeeId) {
        List<TimeOff> timeOffs = timeOffService.getTimeOffsByEmployee(employeeId);
        return ResponseEntity.ok(timeOffs);
    }

    // [Compat] RN 경로 호환: GET /api/timeoff/store/{storeId}
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStoreCompat(@PathVariable Long storeId) {
        List<TimeOff> timeOffs = timeOffService.getTimeOffsByStore(storeId);
        return ResponseEntity.ok(timeOffs);
    }

    // [Compat] RN 경로 호환: GET /api/timeoff/store/{storeId}/status/{status}
    @GetMapping("/store/{storeId}/status/{status}")
    public ResponseEntity<List<TimeOff>> getTimeOffsByStoreAndStatusCompat(@PathVariable Long storeId,
                                                                           @PathVariable TimeOffStatus status) {
        List<TimeOff> timeOffs = timeOffService.getTimeOffsByStoreAndStatus(storeId, status);
        return ResponseEntity.ok(timeOffs);
    }

    // [Compat] RN 경로 호환: GET /api/timeoff/employee/{employeeId}
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<TimeOff>> getTimeOffsByEmployeeCompat(@PathVariable Long employeeId) {
        List<TimeOff> timeOffs = timeOffService.getTimeOffsByEmployee(employeeId);
        return ResponseEntity.ok(timeOffs);
    }

    /**
     * 휴가 신청 승인
     */
    @PutMapping("/{timeOffId}/approve")
    public ResponseEntity<TimeOff> approveTimeOff(@PathVariable Long timeOffId) {
        TimeOff timeOff = timeOffService.approveTimeOffRequest(timeOffId);
        return ResponseEntity.ok(timeOff);
    }

    /**
     * 휴가 신청 거부
     */
    @PutMapping("/{timeOffId}/reject")
    public ResponseEntity<TimeOff> rejectTimeOff(@PathVariable Long timeOffId) {
        TimeOff timeOff = timeOffService.rejectTimeOffRequest(timeOffId);
        return ResponseEntity.ok(timeOff);
    }
}
