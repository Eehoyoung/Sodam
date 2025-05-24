package com.rich.sodam.controller;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.dto.request.AttendanceRequestDto;
import com.rich.sodam.dto.response.AttendanceResponseDto;
import com.rich.sodam.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 직원 출퇴근 관리 컨트롤러
 * 직원들의 출근/퇴근 기록을 관리하고 조회하는 API를 제공합니다.
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    /**
     * 직원 출근 처리 API
     */
    @PostMapping("/check-in")
    public ResponseEntity<AttendanceResponseDto> checkIn(@RequestBody @Validated AttendanceRequestDto request) {
        Attendance attendance = attendanceService.checkInWithVerification(
                request.getEmployeeId(),
                request.getStoreId(),
                request.getLatitude(),
                request.getLongitude()
        );

        return ResponseEntity.ok(AttendanceResponseDto.from(attendance));
    }


    /**
     * 직원 퇴근 처리 API
     */
    @PostMapping("/check-out")
    public ResponseEntity<AttendanceResponseDto> checkOut(@RequestBody @Validated AttendanceRequestDto request) {
        Attendance attendance = attendanceService.checkOutWithVerification(
                request.getEmployeeId(),
                request.getStoreId(),
                request.getLatitude(),
                request.getLongitude()
        );

        return ResponseEntity.ok(AttendanceResponseDto.from(attendance));
    }

    /**
     * 특정 직원의 출퇴근 기록 조회 API
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<AttendanceResponseDto>> getAttendancesByEmployee(
            @PathVariable Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        List<Attendance> attendances = attendanceService.getAttendancesByEmployeeAndPeriod(
                employeeId, startDate, endDate);

        List<AttendanceResponseDto> responseDtos = attendances.stream()
                .map(AttendanceResponseDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDtos);
    }

    /**
     * 특정 매장의 출퇴근 기록 조회 API
     */
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<AttendanceResponseDto>> getAttendancesByStore(
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        List<Attendance> attendances = attendanceService.getAttendancesByStoreAndPeriod(
                storeId, startDate, endDate);

        List<AttendanceResponseDto> responseDtos = attendances.stream()
                .map(AttendanceResponseDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDtos);
    }

    /**
     * 특정 직원의 월별 출퇴근 기록 조회 API
     */
    @GetMapping("/employee/{employeeId}/monthly")
    public ResponseEntity<List<AttendanceResponseDto>> getMonthlyAttendancesByEmployee(
            @PathVariable Long employeeId,
            @RequestParam int year,
            @RequestParam int month) {

        List<Attendance> attendances = attendanceService.getMonthlyAttendancesByEmployee(
                employeeId, year, month);

        List<AttendanceResponseDto> responseDto = attendances.stream()
                .map(AttendanceResponseDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDto);
    }


}