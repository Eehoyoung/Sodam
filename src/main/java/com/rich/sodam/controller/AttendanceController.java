package com.rich.sodam.controller;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.dto.request.AttendanceRequestDto;
import com.rich.sodam.dto.request.ManualAttendanceRequestDto;
import com.rich.sodam.dto.response.AttendanceResponseDto;
import com.rich.sodam.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "출퇴근 관리", description = "직원 출퇴근 기록 관리 API")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/check-in")
    @Operation(summary = "직원 출근 처리", description = "직원 출근 정보를 기록하고 위치 인증을 수행합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "출근 처리 성공",
                    content = @Content(schema = @Schema(implementation = AttendanceResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "403", description = "위치 인증 실패")
    })
    public ResponseEntity<AttendanceResponseDto> checkIn(@RequestBody @Validated AttendanceRequestDto request) {
        Attendance attendance = attendanceService.checkInWithVerification(
                request.getEmployeeId(),
                request.getStoreId(),
                request.getLatitude(),
                request.getLongitude()
        );

        return ResponseEntity.ok(AttendanceResponseDto.from(attendance));
    }


    @Operation(summary = "직원 퇴근 처리", description = "직원 퇴근 정보를 기록하고 위치 인증을 수행합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "퇴근 처리 성공",
                    content = @Content(schema = @Schema(implementation = AttendanceResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "403", description = "위치 인증 실패"),
            @ApiResponse(responseCode = "404", description = "해당 직원의 출근 기록이 없음")
    })
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

    @Operation(summary = "직원별 출퇴근 기록 조회", description = "특정 기간 동안의 직원 출퇴근 기록을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<AttendanceResponseDto>> getAttendancesByEmployee(
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "조회 시작일시 (ISO 형식: yyyy-MM-dd'T'HH:mm:ss)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "조회 종료일시 (ISO 형식: yyyy-MM-dd'T'HH:mm:ss)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        List<Attendance> attendances = attendanceService.getAttendancesByEmployeeAndPeriod(
                employeeId, startDate, endDate);

        List<AttendanceResponseDto> responseDtos = attendances.stream()
                .map(AttendanceResponseDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "매장별 출퇴근 기록 조회", description = "특정 기간 동안의 매장 내 모든 직원의 출퇴근 기록을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "매장 정보를 찾을 수 없음")
    })
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<AttendanceResponseDto>> getAttendancesByStore(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "조회 시작일시 (ISO 형식: yyyy-MM-dd'T'HH:mm:ss)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "조회 종료일시 (ISO 형식: yyyy-MM-dd'T'HH:mm:ss)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        List<Attendance> attendances = attendanceService.getAttendancesByStoreAndPeriod(
                storeId, startDate, endDate);

        List<AttendanceResponseDto> responseDtos = attendances.stream()
                .map(AttendanceResponseDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDtos);
    }

    @Operation(summary = "직원별 월간 출퇴근 기록 조회", description = "특정 직원의 월간 출퇴근 기록을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{employeeId}/monthly")
    public ResponseEntity<List<AttendanceResponseDto>> getMonthlyAttendancesByEmployee(
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "조회 연도", required = true, example = "2025") @RequestParam int year,
            @Parameter(description = "조회 월 (1-12)", required = true, example = "5") @RequestParam int month) {

        List<Attendance> attendances = attendanceService.getMonthlyAttendancesByEmployee(
                employeeId, year, month);

        List<AttendanceResponseDto> responseDto = attendances.stream()
                .map(AttendanceResponseDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDto);
    }

    @Operation(summary = "수동 출퇴근 등록", description = "사업주가 직원 대신 출퇴근 기록을 수동으로 등록합니다. ATTEND-004 기능입니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "수동 등록 성공",
                    content = @Content(schema = @Schema(implementation = AttendanceResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청 (중복 기록, 잘못된 시간 등)"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "403", description = "사업주 권한 필요"),
            @ApiResponse(responseCode = "404", description = "직원 또는 매장 정보를 찾을 수 없음")
    })
    @PostMapping("/manual-register")
    public ResponseEntity<AttendanceResponseDto> registerManualAttendance(
            @RequestBody @Validated ManualAttendanceRequestDto request) {

        Attendance attendance = attendanceService.registerManualAttendance(request);

        return ResponseEntity.ok(AttendanceResponseDto.from(attendance));
    }
}
