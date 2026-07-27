package com.rich.sodam.controller;

import com.rich.sodam.dto.request.PayrollWizardConfirmRequest;
import com.rich.sodam.dto.response.PayrollWizardConfirmResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.PayrollWizardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사장님 웹 콘솔 급여 정산 마법사 API. 1·2단계(대상선정·계산확인)는 기존
 * {@code POST /api/payroll/calculate}(employeeId 미지정 시 매장 일괄 계산 모드)를 그대로 사용하고,
 * 3단계("확정")만 이 네임스페이스에 신규로 둔다 — 여러 직원을 한 화면에서 검토 후 한 번에 확정하는
 * 웹 UX는 트랜잭션 경계를 백엔드가 갖는 편이 정합성에 유리하다(02_API_활용계획.md §6).
 *
 * <p>⛔ 사장 본인 전용({@code @MasterOnly}) — 매니저 위임({@code PAYROLL_CONFIRM}) 흐름은 이 컨트롤러에서
 * 노출·확장하지 않는다(노무사 검토 미완료, CLAUDE.md).
 */
@MasterOnly
@RestController
@RequestMapping("/api/web/payroll/wizard")
@RequiredArgsConstructor
@Tag(name = "급여 정산 마법사(웹 콘솔)", description = "사장 본인 전용 급여 확정 일괄 처리 API")
public class PayrollWizardController {

    private final PayrollWizardService payrollWizardService;
    private final StoreAuthorizationPolicy guard;

    @Operation(summary = "급여 정산 마법사 확정(일괄)",
            description = "검토를 마친 여러 직원의 DRAFT/CONFIRMED 급여를 한 번에 확정(발급)합니다. " +
                    "단일 트랜잭션으로 처리되어 하나라도 실패하면 전체가 롤백됩니다. " +
                    "Idempotency-Key 헤더 필수 — 동일 키 재요청은 재확정 없이 최초 결과를 그대로 반환합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "확정 성공",
                    content = @Content(schema = @Schema(implementation = PayrollWizardConfirmResponse.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청(Idempotency-Key 누락 등)"),
            @ApiResponse(responseCode = "403", description = "권한 없음(사장 본인이 아니거나 소유하지 않은 매장)"),
            @ApiResponse(responseCode = "404", description = "급여 정보를 찾을 수 없음")
    })
    @PostMapping("/confirm")
    public ResponseEntity<PayrollWizardConfirmResponse> confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "멱등성 키(필수) — 네트워크 재시도로 같은 확정 요청이 중복 전송돼도 안전합니다.", required = true)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody PayrollWizardConfirmRequest request) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key 헤더가 필요해요.");
        }
        guard.assertMasterOwnsStore(principal.getId(), request.storeId());
        PayrollWizardConfirmResponse response = payrollWizardService.confirm(
                principal.getId(), request, idempotencyKey);
        return ResponseEntity.ok(response);
    }
}
