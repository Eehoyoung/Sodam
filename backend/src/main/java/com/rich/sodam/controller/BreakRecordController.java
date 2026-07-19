package com.rich.sodam.controller;

import com.rich.sodam.dto.request.BreakRecordCreateRequest;
import com.rich.sodam.dto.response.BreakRecordResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.BreakRecordService;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 휴게 부여 증빙 (L-NEW-04, 근로기준법 §54) — 사장 전용.
 *
 * <p>휴게는 임금 공제가 아니라 부여 의무. 실제 줬다는 기록이 없으면 임금체불 진정 시 사장이 불리.
 * 임금계산(Attendance/WorkHoursCalculator)과 독립된 증빙 전용 기록.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}")
@RequiredArgsConstructor
@Tag(name = "휴게 부여 증빙", description = "휴게시간 부여 기록 (§54, 사장)")
public class BreakRecordController {

    private final BreakRecordService breakRecordService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "휴게 부여 기록 추가")
    @PostMapping("/employees/{employeeId}/breaks")
    public ResponseEntity<BreakRecordResponse> add(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId,
            @Valid @RequestBody BreakRecordCreateRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(breakRecordService.add(employeeId, storeId, req));
    }

    @Operation(summary = "휴게 부여 기록 목록")
    @GetMapping("/employees/{employeeId}/breaks")
    public ResponseEntity<List<BreakRecordResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(breakRecordService.listForEmployee(employeeId, storeId));
    }

    @Operation(summary = "휴게 부여 기록 삭제")
    @DeleteMapping("/employees/{employeeId}/breaks/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId,
            @PathVariable Long id) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        breakRecordService.delete(storeId, id);
        return ResponseEntity.noContent().build();
    }
}
