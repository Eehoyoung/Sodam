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
     * 휴가 신청 생성
     */
    @PostMapping
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
