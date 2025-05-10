package com.rich.sodam.controller;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.dto.AttendanceRequestDto;
import com.rich.sodam.service.AttendanceService;
import com.rich.sodam.service.LocationVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final LocationVerificationService locationService;

    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(@RequestBody AttendanceRequestDto request) {
        // 위치 검증
        boolean locationVerified = locationService.verifyUserInStore(
                request.getStoreId(), request.getLatitude(), request.getLongitude());

        if (!locationVerified) {
            return ResponseEntity.badRequest()
                    .body("매장 위치를 벗어났습니다. 매장 내에서 출근해주세요.");
        }

        // 출근 처리
        Attendance attendance = attendanceService.checkIn(
                request.getEmployeeId(),
                request.getStoreId(),
                request.getLatitude(),
                request.getLongitude()
        );

        return ResponseEntity.ok(attendance);
    }

    @PostMapping("/check-out")
    public ResponseEntity<?> checkOut(@RequestBody AttendanceRequestDto request) {
        // 위치 검증
        boolean locationVerified = locationService.verifyUserInStore(
                request.getStoreId(), request.getLatitude(), request.getLongitude());

        if (!locationVerified) {
            return ResponseEntity.badRequest()
                    .body("매장 위치를 벗어났습니다. 매장 내에서 퇴근해주세요.");
        }

        // 퇴근 처리
        Attendance attendance = attendanceService.checkOut(
                request.getEmployeeId(),
                request.getStoreId(),
                request.getLatitude(),
                request.getLongitude()
        );

        return ResponseEntity.ok(attendance);
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<Attendance>> getAttendancesByEmployee(
            @PathVariable Long employeeId,
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {

        List<Attendance> attendances = attendanceService.getAttendancesByEmployeeAndPeriod(
                employeeId, startDate, endDate);

        return ResponseEntity.ok(attendances);
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<Attendance>> getAttendancesByStore(
            @PathVariable Long storeId,
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {

        List<Attendance> attendances = attendanceService.getAttendancesByStoreAndPeriod(
                storeId, startDate, endDate);

        return ResponseEntity.ok(attendances);
    }
}