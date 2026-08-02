package com.rich.sodam.service;

import com.rich.sodam.config.AttendanceCreditProperties;
import com.rich.sodam.config.integration.TossCancelProration;
import com.rich.sodam.config.integration.TossPaymentGateway;
import com.rich.sodam.domain.AttendanceCreditChargeOrder;
import com.rich.sodam.domain.PaymentCancelReversalAudit;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import com.rich.sodam.repository.AttendanceCreditChargeOrderRepository;
import com.rich.sodam.repository.PaymentCancelReversalAuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * 출근권 충전소(IAP) 주문·승인 서비스(recruitment-monetization-gamification-plan.md §2.4, §7).
 *
 * <p>흐름은 {@code TaxServiceOrderService}(세무 패키지 단건결제)와 동일하다: 1) 주문 생성(PENDING,
 * 금액·수량 고정) → 2) FE 토스 결제창 → paymentKey 획득 → 3) 서버 승인(confirm): 금액 위변조 방지 +
 * 멱등(이미 PAID면 그대로). 실제 잔액/원장 변경은 {@link AttendanceCreditService#grantCharge}에
 * 위임한다 — 이 서비스는 주문(결제) 상태 전이만 책임진다(로직 중복 금지).</p>
 *
 * <p><b>웹훅 이중 방어</b>: FE의 동기 {@link #confirm}과 {@code TossWebhookService}가 호출하는
 * {@link #applyFromWebhook}은 둘 다 {@link AttendanceCreditChargeOrderRepository#findByOrderIdForUpdate}
 * 비관적 락으로 같은 주문 행을 직렬화하고, {@link AttendanceCreditChargeOrder#isPaid()}를 먼저 확인해
 * 어느 경로가 먼저 도착해도 지급은 정확히 1회만 일어난다(재시도·중복 웹훅 멱등).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceCreditChargeService {

    private final AttendanceCreditChargeOrderRepository orderRepository;
    private final AttendanceCreditService attendanceCreditService;
    private final AttendanceCreditProperties properties;
    private final TossPaymentGateway paymentGateway;
    private final PaymentCancelReversalAuditRepository reversalAuditRepository;

    // ─────────────────────────────────────────────────────────────────
    // 카탈로그
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AttendanceCreditProperties.PackQuote> packCatalog() {
        return properties.getCharge().allQuotes();
    }

    // ─────────────────────────────────────────────────────────────────
    // 주문 생성 / 승인
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public AttendanceCreditChargeOrder createOrder(Long ownerUserId, AttendanceCreditChargePackCode packCode) {
        AttendanceCreditProperties.PackQuote quote = properties.getCharge().quote(packCode);
        String orderId = "ACC_" + ownerUserId + "_" + UUID.randomUUID().toString().substring(0, 12);
        AttendanceCreditChargeOrder order = AttendanceCreditChargeOrder.create(
                ownerUserId, packCode, orderId, quote.priceKrw(), quote.creditQuantity(), quote.ticketQuantity());
        return orderRepository.save(order);
    }

    /**
     * 결제 승인(FE 동기 호출). 금액은 <b>서버 보관 주문 금액</b>으로 검증(클라이언트 금액 신뢰 금지).
     */
    @Transactional
    public AttendanceCreditChargeOrder confirm(Long ownerUserId, String orderId, String paymentKey, int clientAmount) {
        AttendanceCreditChargeOrder order = orderRepository.findByOrderIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + orderId));
        if (!order.getOwnerUserId().equals(ownerUserId)) {
            throw new IllegalStateException("본인 주문만 결제할 수 있습니다.");
        }
        if (order.isPaid()) {
            return order; // 멱등: 이미 승인된 주문(FE 재시도·중복 탭 방지)
        }
        if (order.isCancelledOrRefunded()) {
            throw new IllegalStateException("이미 취소·환불된 주문이에요. 다시 구매해 주세요.");
        }
        if (clientAmount != order.getAmountKrw()) {
            throw new IllegalArgumentException("결제 금액이 주문 금액과 일치하지 않습니다.");
        }

        TossPaymentGateway.ConfirmResult result = paymentGateway.confirm(paymentKey, orderId, order.getAmountKrw());
        if (!result.isSuccess()) {
            throw new IllegalStateException("결제 승인 실패: " + result.getFailureReason());
        }

        applyPaidOrder(order, result.getPaymentKey());
        return order;
    }

    /**
     * 웹훅 DONE 백업 경로 — FE의 동기 confirm 호출이 유실됐을 때를 대비한 안전망(구독 웹훅의
     * {@code activateSubscriptionIfNeeded}와 동일 원칙). orderId 로 조회해 아직 PAID 가 아니면
     * 지급을 마저 반영하고, 이미 PAID/취소·환불이면 조용히 스킵한다(멱등).
     */
    @Transactional
    public void applyFromWebhook(String orderId, String paymentKey) {
        orderRepository.findByOrderIdForUpdate(orderId).ifPresent(order -> {
            if (order.isPaid() || order.isCancelledOrRefunded()) {
                return;
            }
            applyPaidOrder(order, paymentKey);
        });
    }

    /**
     * 웹훅 취소/실패 경로. 아직 지급 전(PENDING)이면 그냥 CANCELLED 처리(미지급 보장 — 애초에
     * 잔액을 건드리지 않았으니 롤백할 것도 없다). 이미 지급된(PAID) 주문이 뒤늦게 취소/환불되면
     * {@link AttendanceCreditService#reverseChargeBestEffort}로 최선노력 회수한다 — 이때 전량이 아니라
     * {@code cancelInfo}로 해석한 취소 비율만큼만 비례 회수한다(recruitment-monetization-gamification-plan.md
     * §12.2, 부분환불이 전액환불과 동일하게 처리되던 문제 수정). 회수 결과는 감사 로그(DB)에 남긴다.
     *
     * @param cancelInfo 웹훅 payload에서 파싱한 취소 금액 정보({@code TossWebhookService}가 전달) —
     *                    정보가 없으면 {@link TossCancelProration#prorate}가 안전하게 전액취소로 폴백한다.
     */
    @Transactional
    public void cancelFromWebhook(String orderId, String reasonStatus, TossCancelProration.ParsedCancelAmount cancelInfo) {
        orderRepository.findByOrderIdForUpdate(orderId).ifPresent(order -> {
            if (order.isCancelledOrRefunded()) {
                return; // 멱등 — 중복 취소 웹훅
            }
            if (order.isPaid()) {
                TossCancelProration.Proration creditProration = TossCancelProration.prorate(
                        cancelInfo, order.getAmountKrw(), order.totalCreditQuantity());
                TossCancelProration.Proration ticketProration = TossCancelProration.prorate(
                        cancelInfo, order.getAmountKrw(), order.getTicketQuantity());
                log.info("출근권 충전 주문 결제취소(웹훅) — 지급분 회수 시도 orderId={} status={} 취소비율={} 회수요청(출근권/티켓)={}/{}",
                        orderId, reasonStatus, creditProration.cancelRatio(),
                        creditProration.proratedQuantity(), ticketProration.proratedQuantity());

                AttendanceCreditService.ReversalResult result = attendanceCreditService.reverseChargeBestEffort(
                        order.getOwnerUserId(), creditProration.proratedQuantity(), ticketProration.proratedQuantity());

                recordReversalAudit(order, reasonStatus, creditProration,
                        PaymentCancelReversalAudit.QuantityUnit.CREDIT,
                        result.creditsRequested(), result.creditsActuallyReversed());
                recordReversalAudit(order, reasonStatus, ticketProration,
                        PaymentCancelReversalAudit.QuantityUnit.STREAK_RECOVERY_TICKET,
                        result.ticketsRequested(), result.ticketsActuallyReversed());

                order.markRefunded();
            } else {
                order.markCancelled();
            }
            orderRepository.save(order);
        });
    }

    private void recordReversalAudit(AttendanceCreditChargeOrder order, String reasonStatus,
                                      TossCancelProration.Proration proration,
                                      PaymentCancelReversalAudit.QuantityUnit unit,
                                      int requestedQuantity, int actualQuantity) {
        reversalAuditRepository.save(PaymentCancelReversalAudit.of(
                PaymentCancelReversalAudit.OrderType.ATTENDANCE_CREDIT_CHARGE, order.getOrderId(),
                order.getOwnerUserId(), reasonStatus, order.getAmountKrw(), proration.resolvedCancelAmountKrw(),
                proration.cancelRatio(), unit, requestedQuantity, actualQuantity));
    }

    @Transactional(readOnly = true)
    public List<AttendanceCreditChargeOrder> myOrders(Long ownerUserId) {
        return orderRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }

    /**
     * 실제 지급 반영 — {@link #confirm}(동기)과 {@link #applyFromWebhook}(비동기 백업) 둘 다 이
     * 메서드로 수렴한다. 호출자는 반드시 {@code findByOrderIdForUpdate}로 락을 쥔 상태여야 한다.
     */
    private void applyPaidOrder(AttendanceCreditChargeOrder order, String paymentKey) {
        if (order.isPaid()) {
            return; // 이중 방어(호출자가 이미 체크하지만, 이 메서드 단독으로도 멱등해야 안전)
        }
        AttendanceCreditService.ChargeGrantResult grant = attendanceCreditService.grantCharge(
                order.getOwnerUserId(), order.getPackCode(), order.getCreditQuantity(), order.getTicketQuantity(),
                properties.getCharge().isFirstPurchaseBonusEnabled(),
                properties.getCharge().getFirstPurchaseBonusMultiplier());
        order.markPaid(paymentKey, grant.bonusCreditQuantity());
        orderRepository.save(order);
        log.info("출근권 충전 결제완료 orderId={} pack={} 지급(기본+보너스)={}",
                order.getOrderId(), order.getPackCode(), order.totalCreditQuantity());
    }
}
