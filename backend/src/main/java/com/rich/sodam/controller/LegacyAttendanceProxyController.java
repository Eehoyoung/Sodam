package com.rich.sodam.controller;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.dto.request.AttendanceRequestDto;
import com.rich.sodam.dto.response.AttendanceResponseDto;
import com.rich.sodam.service.AttendanceService;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.rich.sodam.security.annotation.EmployeeOrMaster;

/**
 * 레거시 경로(/attendance) 임시 수용 프록시 컨트롤러
 * - 신규 표준 경로: /api/attendance
 * - 병행 운영 기간: 14일 (공지 기준)
 */
@Slf4j
@EmployeeOrMaster
@RestController
@RequestMapping("/attendance")
@RequiredArgsConstructor
@Tag(name = "출퇴근 관리(Deprecated)", description = "레거시 경로 프록시. /api/attendance 사용 권장")
public class LegacyAttendanceProxyController {

    private final AttendanceService attendanceService;

    private HttpHeaders deprecationHeaders(String successor) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Deprecation", "true");
        headers.add("Link", "<" + successor + ">; rel=\"successor-version\"");
        headers.add("Warning", "299 - \"이 엔드포인트는 곧 폐지됩니다. /api/attendance 경로로 전환하세요.\"");
        return headers;
    }

    @PostMapping("/check-in")
    @Operation(summary = "[Deprecated] 출근 처리", description = "표준 경로 /api/attendance/check-in 으로 위임됩니다.")
    @Hidden
    public ResponseEntity<AttendanceResponseDto> legacyCheckIn(@RequestBody @Validated AttendanceRequestDto request) {
        log.warn("[DEPRECATED] /attendance/check-in 호출. /api/attendance/check-in 사용 권장");
        Attendance attendance = attendanceService.checkInWithVerification(
                request.getEmployeeId(), request.getStoreId(), request.getLatitude(), request.getLongitude()
        );
        return ResponseEntity.ok()
                .headers(deprecationHeaders("/api/attendance/check-in"))
                .body(AttendanceResponseDto.from(attendance));
    }

    @PostMapping("/check-out")
    @Operation(summary = "[Deprecated] 퇴근 처리", description = "표준 경로 /api/attendance/check-out 으로 위임됩니다.")
    @Hidden
    public ResponseEntity<AttendanceResponseDto> legacyCheckOut(@RequestBody @Validated AttendanceRequestDto request) {
        log.warn("[DEPRECATED] /attendance/check-out 호출. /api/attendance/check-out 사용 권장");
        Attendance attendance = attendanceService.checkOutWithVerification(
                request.getEmployeeId(), request.getStoreId(), request.getLatitude(), request.getLongitude()
        );
        return ResponseEntity.ok()
                .headers(deprecationHeaders("/api/attendance/check-out"))
                .body(AttendanceResponseDto.from(attendance));
    }
}
