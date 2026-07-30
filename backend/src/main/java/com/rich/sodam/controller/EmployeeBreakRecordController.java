package com.rich.sodam.controller;

import com.rich.sodam.dto.response.BreakRecordResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.BreakRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 직원 본인의 실시간 휴게 시작/종료 기록 (L-NEW-04 확장) — 직원 전용.
 *
 * <p>급여 계산과 완전히 무관한 순수 기록/증빙용이다({@code BreakRecordService} 참고). 사장의 사후 부여
 * 증빙 입력({@link BreakRecordController}, {@code @MasterOnly})과는 별도 경로 — 클래스 레벨에
 * {@code @MasterOnly}가 있는 그 컨트롤러에 얹지 않고 별도 컨트롤러로 분리했다.
 *
 * <p>권한: 본인 것만 조작 가능 — 경로에 employeeId 를 받지 않고 {@code @AuthenticationPrincipal}에서
 * 얻은 principal.getId() 를 그대로 employeeId 로 사용한다(다른 자기 서비스 API와 동일 패턴,
 * 예: {@code AttendanceController}). 매장 소속 여부는 {@link StoreAuthorizationPolicy#assertEmployeeInStore}
 * 로, 기록 소유자 일치는 서비스 레이어({@code BreakRecordService#completeByEmployee})에서 검증한다.
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/stores/{storeId}/employees/me/breaks")
@RequiredArgsConstructor
@Tag(name = "휴게 실시간 기록", description = "직원 본인의 휴게 시작/종료 기록 (§54, 순수 기록/증빙용)")
public class EmployeeBreakRecordController {

    private final BreakRecordService breakRecordService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "휴게 시작 기록", description = "이미 진행 중인(종료 안 된) 휴게가 있으면 400.")
    @PostMapping("/start")
    public ResponseEntity<BreakRecordResponse> start(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertEmployeeInStore(principal.getId(), storeId);
        return ResponseEntity.ok(breakRecordService.startByEmployee(principal.getId(), storeId));
    }

    @Operation(summary = "휴게 종료 기록", description = "본인의 진행 중인 휴게 기록만 종료할 수 있다.")
    @PostMapping("/{breakRecordId}/end")
    public ResponseEntity<BreakRecordResponse> end(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long breakRecordId) {
        storeAccessGuard.assertEmployeeInStore(principal.getId(), storeId);
        return ResponseEntity.ok(
                breakRecordService.completeByEmployee(principal.getId(), storeId, breakRecordId));
    }

    @Operation(summary = "본인 휴게 기록 목록", description = "from/to 를 함께 주면 근무일 기준 기간 필터, 아니면 전체 이력.")
    @GetMapping
    public ResponseEntity<List<BreakRecordResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        storeAccessGuard.assertEmployeeInStore(principal.getId(), storeId);
        return ResponseEntity.ok(
                breakRecordService.listForEmployeeSelf(principal.getId(), storeId, from, to));
    }
}
