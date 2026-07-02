package com.rich.sodam.controller;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.PayrollBonus;
import com.rich.sodam.dto.request.PayrollBonusCreateRequest;
import com.rich.sodam.dto.response.PayrollBonusResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.NotificationService;
import com.rich.sodam.service.PayrollBonusService;
import com.rich.sodam.service.StoreAccessGuard;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 즉시 보너스(비정기 포상금) API — "오늘 바빠서 1만원 더" 같은 사장의 즉흥 지급을 기록한다.
 *
 * <p>권한: 사장 작업은 {@link MasterOnly} + 매장 ownership 검증, 직원 조회는 principal 본인 한정.
 * 급여합산형(INCLUDED_IN_PAYROLL) 보너스는 다음 급여 정산 시 {@link com.rich.sodam.service.PayrollService}
 * 가 자동으로 합산한다(이 컨트롤러는 등록·조회만 담당).
 */
@EmployeeOrMaster
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class PayrollBonusController {

    private final PayrollBonusService payrollBonusService;
    private final StoreAccessGuard guard;
    private final NotificationService notificationService;

    /** 사장이 직원에게 즉시 보너스를 등록한다. */
    @MasterOnly
    @PostMapping("/stores/{storeId}/bonuses")
    public ResponseEntity<PayrollBonusResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody PayrollBonusCreateRequest body) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        guard.assertEmployeeInStore(body.employeeId(), storeId);

        PayrollBonus saved = payrollBonusService.create(
                storeId, body.employeeId(), principal.getId(),
                body.bonusDate(), body.amount(), body.reason(), body.paymentTiming());

        // EmployeeProfile.id == User.id → employeeId 가 곧 알림 수신 userId
        notificationService.push(saved.getEmployeeId(), PushMessage.builder()
                .title("보너스를 받았어요")
                .body(String.format("사장님이 %,d원 보너스를 지급했어요.", saved.getAmount()))
                .deepLink("sodam://bonus")
                .data(Map.of("type", "BONUS_GIVEN"))
                .build());

        return ResponseEntity.ok(PayrollBonusResponse.from(saved));
    }

    /** 사장이 특정 직원의 보너스 이력을 조회한다. */
    @MasterOnly
    @GetMapping("/stores/{storeId}/employees/{employeeId}/bonuses")
    public ResponseEntity<List<PayrollBonusResponse>> listForEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        List<PayrollBonusResponse> result = payrollBonusService.findForEmployee(employeeId, storeId).stream()
                .map(PayrollBonusResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /** 직원 본인의 보너스 이력을 조회한다. */
    @GetMapping("/bonuses/my")
    public ResponseEntity<List<PayrollBonusResponse>> my(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<PayrollBonusResponse> result = payrollBonusService.findByEmployee(principal.getId()).stream()
                .map(PayrollBonusResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }
}
