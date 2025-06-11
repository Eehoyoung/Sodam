package com.rich.sodam.controller;

import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.dto.request.PayrollPolicyUpdateDto;
import com.rich.sodam.dto.response.PayrollPolicyDto;
import com.rich.sodam.service.PayrollPolicyService;
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
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payroll-policy")
@RequiredArgsConstructor
@Tag(name = "급여 정책", description = "매장별 급여 정책 관리 API")
public class PayrollPolicyController {

    private final PayrollPolicyService payrollPolicyService;

    @Operation(summary = "매장 급여 정책 조회", description = "특정 매장의 급여 정책을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(schema = @Schema(implementation = PayrollPolicyDto.class))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "매장 정보를 찾을 수 없음")
    })
    @GetMapping("/store/{storeId}")
    public ResponseEntity<PayrollPolicyDto> getStorePayrollPolicy(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId) {
        PayrollPolicy policy = payrollPolicyService.getPayrollPolicyByStore(storeId);
        return ResponseEntity.ok(PayrollPolicyDto.from(policy));
    }

    @Operation(summary = "매장 급여 정책 생성/수정", description = "매장의 급여 정책을 생성하거나 수정합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "생성/수정 성공",
                    content = @Content(schema = @Schema(implementation = PayrollPolicyDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "매장 정보를 찾을 수 없음")
    })
    @PostMapping("/store/{storeId}")
    public ResponseEntity<PayrollPolicyDto> updateStorePayrollPolicy(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "급여 정책 업데이트 정보", required = true)
            @RequestBody @Valid PayrollPolicyUpdateDto updateDto) {

        PayrollPolicy policy = payrollPolicyService.updatePayrollPolicy(storeId, updateDto);
        return ResponseEntity.ok(PayrollPolicyDto.from(policy));
    }
}