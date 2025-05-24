package com.rich.sodam.controller;

import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.dto.request.PayrollPolicyUpdateDto;
import com.rich.sodam.dto.response.PayrollPolicyDto;
import com.rich.sodam.service.PayrollPolicyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payroll-policy")
@RequiredArgsConstructor
public class PayrollPolicyController {

    private final PayrollPolicyService payrollPolicyService;

    /**
     * 매장의 급여 정책 조회
     */
    @GetMapping("/store/{storeId}")
    public ResponseEntity<PayrollPolicyDto> getStorePayrollPolicy(@PathVariable Long storeId) {
        PayrollPolicy policy = payrollPolicyService.getPayrollPolicyByStore(storeId);
        return ResponseEntity.ok(PayrollPolicyDto.from(policy));
    }

    /**
     * 매장의 급여 정책 생성/수정
     */
    @PostMapping("/store/{storeId}")
    public ResponseEntity<PayrollPolicyDto> updateStorePayrollPolicy(
            @PathVariable Long storeId,
            @RequestBody @Valid PayrollPolicyUpdateDto updateDto) {

        PayrollPolicy policy = payrollPolicyService.updatePayrollPolicy(storeId, updateDto);
        return ResponseEntity.ok(PayrollPolicyDto.from(policy));
    }
}

/*
  1. 급여 정책 관리: 매장별 급여 정책을 설정하고 조회하는 기능
  2. 급여 계산: 기본급, 초과근무, 야간근무, 주휴수당을 포함한 급여 계산
  3. 세금 및 공제: 3.3% 원천징수 또는 4대보험 기준의 세금 공제
  4. 급여 내역 조회: 직원별, 매장별, 기간별 급여 내역 조회
  5. 급여 상세 내역 조회: 일별 근무 시간과 급여 상세 내역 조회
  6. 급여 상태 관리: 작성중 → 확정 → 지급완료 상태 관리
  7. 자동 급여 계산: 월별 자동 급여 계산 스케줄링
 */
