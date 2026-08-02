package com.rich.sodam.controller;

import com.rich.sodam.dto.response.AttendanceCreditCheckInResponse;
import com.rich.sodam.dto.response.AttendanceCreditSummaryResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.AttendanceCreditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 출근권(AttendanceCredit) API — 사장 전용 채용 재화(recruitment-monetization-gamification-plan.md §2, §5).
 *
 * <p>사용자(사장) 스코프 리소스라 {@code /me} 경로만 사용하고 매장 스코프가 아니다 — {@link JobSeekerController}
 * 의 {@code GET /api/job-seekers/me} 와 동일 패턴으로 {@code StoreAccessGuard} 가 불필요하다. JWT
 * principal 의 userId 만으로 본인 지갑을 조회/조작하므로 BOLA 여지가 없다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "출근권(AttendanceCredit)", description = "사장 전용 채용 재화 — 잔액/소멸예정/출석 그리드 조회 + 일일 출석체크")
public class AttendanceCreditController {

    private final AttendanceCreditService attendanceCreditService;

    @MasterOnly
    @Operation(summary = "내 출근권 현황 조회",
            description = "잔액(만료분 lazy 반영), 이번 주 소멸 예정 수량, 이번 주 출석 그리드(월~일), 현재 연속 출석일수를 반환합니다.")
    @GetMapping("/api/attendance-credits/me")
    public ResponseEntity<AttendanceCreditSummaryResponse> getMySummary(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(attendanceCreditService.getSummary(principal.getId()));
    }

    @MasterOnly
    @Operation(summary = "오늘 출석체크",
            description = "하루 1회만 가능합니다(중복 시 409). 월~목 3개, 금~일 5개가 지급되며, "
                    + "7일 연속 출석을 달성하면 보너스 10개가 즉시 함께 지급됩니다(수치는 설정값).")
    @PostMapping("/api/attendance-credits/check-in")
    public ResponseEntity<AttendanceCreditCheckInResponse> checkIn(
            @AuthenticationPrincipal UserPrincipal principal) {
        AttendanceCreditCheckInResponse response = attendanceCreditService.checkIn(principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
