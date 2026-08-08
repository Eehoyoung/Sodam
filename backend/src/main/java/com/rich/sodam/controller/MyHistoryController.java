package com.rich.sodam.controller;

import com.rich.sodam.dto.response.MyHistoryResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.web.SensitiveDownloadHeaders;
import com.rich.sodam.service.MyHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 본인 근무 이력(WP-H) — 퇴사한 매장의 기록까지 한 화면에서 보고 내려받는다.
 *
 * <p><b>매장 스코프가 아니라 본인 스코프다.</b> 경로·파라미터 어디에도 {@code storeId}가 없고 서버가
 * JWT의 userId로만 조회하므로, 구조적으로 타인 데이터에 닿을 수 없다 — 퇴사자에게 매장 스코프 API를
 * 열어주는 대신 이 경로를 따로 둔 이유이며, {@code StoreAccessGuard}는 이 작업으로 변경하지 않았다.</p>
 *
 * <p>{@code @EmployeeOrMaster}로 두는 것이 중요하다 — 개인 모드로 전환해도 {@code UserGrade}는
 * {@code EMPLOYEE}로 유지되므로(WP-H 설계 D-8) 퇴사자도 그대로 통과한다. 등급을 낮추는 설계였다면
 * 여기가 403이 되어 데이터 연속성이 깨졌을 것이다.</p>
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/me/history")
@RequiredArgsConstructor
@Tag(name = "내 근무 이력", description = "본인 스코프 과거 기록 조회·내려받기")
public class MyHistoryController {

    private final MyHistoryService myHistoryService;

    @Operation(summary = "내 출퇴근 이력",
            description = "소속 매장을 가리지 않고 본인의 출퇴근 기록을 최신순으로 반환합니다. 퇴사한 매장의 기록도 포함됩니다.")
    @GetMapping("/attendance")
    public ResponseEntity<MyHistoryResponse.Page<MyHistoryResponse.AttendanceItem>> myAttendance(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        // 조회 주체는 언제나 토큰의 사용자다 — 파라미터로 대상을 바꿀 수 있는 여지를 두지 않는다.
        return ResponseEntity.ok(myHistoryService.myAttendance(principal.getId(), page, Math.min(size, 100)));
    }

    @Operation(summary = "내 근로계약 이력",
            description = "본인이 체결한 근로계약을 최신순으로 반환합니다. 퇴사한 매장의 계약도 포함됩니다.")
    @GetMapping("/contracts")
    public ResponseEntity<List<MyHistoryResponse.ContractItem>> myContracts(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(myHistoryService.myContracts(principal.getId()));
    }

    @Operation(summary = "내 근무 기록 CSV 내려받기",
            description = "보존기간이 끝나면 기록은 파기되어 되돌릴 수 없습니다. 파기 전 사전 고지에서 안내하는 내려받기 경로입니다.")
    @GetMapping("/attendance.csv")
    public ResponseEntity<byte[]> downloadMyAttendance(@AuthenticationPrincipal UserPrincipal principal) {
        byte[] body = myHistoryService.myAttendanceCsv(principal.getId());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=utf-8"));
        SensitiveDownloadHeaders.apply(headers);
        headers.setContentDispositionFormData("attachment", "my_attendance_" + LocalDate.now() + ".csv");
        return ResponseEntity.ok().headers(headers).body(body);
    }
}
