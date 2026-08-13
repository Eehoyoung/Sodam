package com.rich.sodam.controller;

import com.rich.sodam.domain.RecruitmentBoostPassOrder;
import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;
import com.rich.sodam.dto.request.RecruitmentBoostPassConfirmRequest;
import com.rich.sodam.dto.response.RecruitmentBoostPassOrderResponse;
import com.rich.sodam.dto.response.RecruitmentBoostPassSummaryResponse;
import com.rich.sodam.dto.response.TaxPaymentReadinessResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.RecruitmentBoostPassService;
import com.rich.sodam.service.PaymentProduct;
import com.rich.sodam.service.PaymentReadinessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 채용 부스트 무제한 패스 API — 사장 전용 채용 재화 애드온 단건결제
 * (recruitment-monetization-gamification-plan.md §2.5, §7).
 *
 * <p>흐름: 1) {@code GET /me} 로 현재 보유 상태 + 상품 목록 확인 → 2) {@code POST /orders} PENDING
 * 주문 생성(orderId/금액 반환) → 3) FE 토스 결제창 → 4) {@code POST /orders/{orderId}/confirm}
 * 서버 최종 승인. {@link com.rich.sodam.controller.AttendanceCreditChargeController}와 동일하게
 * 사용자(사장) 스코프 리소스라 {@code StoreAccessGuard}가 불필요하다 — JWT principal의 userId만으로
 * 본인 지갑/주문을 조작하므로 BOLA 여지가 없다.</p>
 */
@MasterOnly
@RestController
@RequestMapping("/api/recruitment-boost-passes")
@RequiredArgsConstructor
@Tag(name = "채용 부스트 무제한 패스", description = "사장 전용 채용 재화 애드온(3/7/30일 기간제) — 상태 조회/주문/승인")
public class RecruitmentBoostPassController {

    private final RecruitmentBoostPassService passService;
    private final PaymentReadinessService paymentReadinessService;

    @GetMapping("/payment-readiness")
    public ResponseEntity<TaxPaymentReadinessResponse> paymentReadiness() {
        return ResponseEntity.ok(paymentReadinessService.readiness(PaymentProduct.RECRUITMENT_BOOST_PASS));
    }

    @Operation(summary = "무제한 패스 현재 상태",
            description = "활성 패스 보유 여부·만료일(D-day)·상품 목록(3/7/30일권, 설정값)을 함께 반환합니다.")
    @GetMapping("/me")
    public ResponseEntity<RecruitmentBoostPassSummaryResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        RecruitmentBoostPassService.Summary summary = passService.getSummary(principal.getId());
        return ResponseEntity.ok(RecruitmentBoostPassSummaryResponse.from(summary));
    }

    @Operation(summary = "무제한 패스 주문 생성", description = "PENDING 주문 생성 후 orderId/금액 반환. FE는 이 값으로 토스 결제창 호출.")
    @PostMapping("/orders")
    public ResponseEntity<RecruitmentBoostPassOrderResponse> createOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam RecruitmentBoostPassProductCode productCode) {
        RecruitmentBoostPassOrder order = passService.createOrder(principal.getId(), productCode);
        return ResponseEntity.ok(RecruitmentBoostPassOrderResponse.from(order));
    }

    @Operation(summary = "무제한 패스 결제 승인", description = "토스 결제창 성공 후 paymentKey로 서버 최종 승인 → 즉시 연장(스택형).")
    @PostMapping("/orders/{orderId}/confirm")
    public ResponseEntity<RecruitmentBoostPassOrderResponse> confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String orderId,
            @Valid @RequestBody RecruitmentBoostPassConfirmRequest req) {
        RecruitmentBoostPassOrder order = passService.confirm(
                principal.getId(), orderId, req.getPaymentKey(), req.getAmount());
        return ResponseEntity.ok(RecruitmentBoostPassOrderResponse.from(order));
    }

    @Operation(summary = "내 무제한 패스 주문 목록")
    @GetMapping("/orders/me")
    public ResponseEntity<List<RecruitmentBoostPassOrderResponse>> myOrders(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<RecruitmentBoostPassOrderResponse> list = passService.myOrders(principal.getId()).stream()
                .map(RecruitmentBoostPassOrderResponse::from).toList();
        return ResponseEntity.ok(list);
    }
}
