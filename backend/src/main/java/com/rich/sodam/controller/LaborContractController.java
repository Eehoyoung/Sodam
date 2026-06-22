package com.rich.sodam.controller;

import com.rich.sodam.config.integration.PushNotifier.PushMessage;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.request.LaborContractCreateRequest;
import com.rich.sodam.dto.response.LaborContractResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.LaborContractService;
import com.rich.sodam.service.NotificationService;
import com.rich.sodam.service.StoreAccessGuard;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * S1 전자 근로계약서 — 사장 작성·발송 / 직원 열람·서명.
 *
 * <p>권한: 사장 작업은 {@link MasterOnly} + 매장 ownership 검증, 직원 작업은
 * {@code principal.getId()} 기준 본인 한정. EmployeeProfile.id == User.id 이므로
 * principal id 가 곧 employeeId 다.
 */
@EmployeeOrMaster
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class LaborContractController {

    private final LaborContractService laborContractService;
    private final StoreAccessGuard guard;
    private final NotificationService notificationService;

    // ===== 사장 (Master) =====

    /**
     * 사장이 근로계약서를 작성·저장한다.
     */
    @MasterOnly
    @RequirePlan(min = PlanType.PRO, features = PlanFeature.E_CONTRACT)
    @PostMapping("/stores/{storeId}/labor-contracts")
    public ResponseEntity<LaborContractResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody LaborContractCreateRequest body) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        guard.assertEmployeeInStore(body.employeeId(), storeId);
        LaborContract saved = laborContractService.save(body.toEntity(storeId));
        return ResponseEntity.ok(LaborContractResponse.from(saved));
    }

    /**
     * 사장이 특정 직원의 근로계약서 목록을 조회한다.
     */
    @MasterOnly
    @GetMapping("/stores/{storeId}/employees/{employeeId}/labor-contracts")
    public ResponseEntity<List<LaborContractResponse>> listForEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        List<LaborContractResponse> result = laborContractService.findFor(employeeId, storeId).stream()
                .map(LaborContractResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 사장이 작성한 근로계약서를 직원에게 발송(인박스 알림 적재)한다.
     * 외부 발신이 아닌 앱 내 알림 적재이므로 자율 수행 OK.
     */
    @MasterOnly
    @PostMapping("/stores/{storeId}/labor-contracts/{id}/send")
    public ResponseEntity<Void> send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long id) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        LaborContract contract = laborContractService.findById(id);
        if (!contract.getStoreId().equals(storeId)) {
            throw new IllegalArgumentException("해당 매장의 근로계약서가 아니에요.");
        }
        // EmployeeProfile.id == User.id → employeeId 가 곧 알림 수신 userId
        notificationService.push(contract.getEmployeeId(), PushMessage.builder()
                .title("근로계약서가 도착했어요")
                .body("사장님이 근로계약서를 보냈어요. 내용을 확인하고 서명해 주세요.")
                .deepLink("sodam://contract")
                .data(Map.of("type", "CONTRACT_SENT"))
                .build());
        return ResponseEntity.ok().build();
    }

    // ===== 직원 (Employee) =====

    /**
     * 직원 본인의 근로계약서 목록을 조회한다.
     */
    @GetMapping("/labor-contracts/my")
    public ResponseEntity<List<LaborContractResponse>> my(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<LaborContractResponse> result = laborContractService.findByEmployee(principal.getId()).stream()
                .map(LaborContractResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 직원 본인이 근로계약서에 서명(동의)한다. 멱등 — 중복 호출 시 최초 서명 시각 유지.
     */
    @PostMapping("/labor-contracts/{id}/sign")
    public ResponseEntity<LaborContractResponse> sign(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        LaborContract signed = laborContractService.sign(id, principal.getId());
        return ResponseEntity.ok(LaborContractResponse.from(signed));
    }
}
