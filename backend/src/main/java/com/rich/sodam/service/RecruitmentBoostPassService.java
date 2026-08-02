package com.rich.sodam.service;

import com.rich.sodam.config.RecruitmentBoostPassProperties;
import com.rich.sodam.config.integration.TossCancelProration;
import com.rich.sodam.config.integration.TossPaymentGateway;
import com.rich.sodam.domain.PaymentCancelReversalAudit;
import com.rich.sodam.domain.RecruitmentBoostPass;
import com.rich.sodam.domain.RecruitmentBoostPassOrder;
import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;
import com.rich.sodam.repository.PaymentCancelReversalAuditRepository;
import com.rich.sodam.repository.RecruitmentBoostPassOrderRepository;
import com.rich.sodam.repository.RecruitmentBoostPassRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * 채용 부스트 무제한 패스 서비스 — 사장(User) 단위 3/7/30일 기간제 애드온
 * (recruitment-monetization-gamification-plan.md §2.5, §7).
 *
 * <p><b>기존 매장 정기구독과의 관계</b>: {@link com.rich.sodam.domain.Subscription}은 매장 단위
 * 반복결제 티어이고, 이 패스는 사장 단위 1회성 기간제 상품이다 — 계획서 §2.5 "기존 매장 구독
 * 티어와는 별개의 애드온 개념"에 따라 완전히 분리된 트랙으로 둔다(번들링하지 않는다).</p>
 *
 * <p><b>과금 우회 지점</b>: {@link #hasActivePass}는 {@code JobOfferService}/{@code JobApplicationService}의
 * 과금 판정 지점에서 {@code AttendanceCreditService} 소모 호출 <b>전에</b> 먼저 확인된다 — 활성
 * 패스가 있으면 출근권을 전혀 건드리지 않고 통과한다(§2.3 "무제한 패스 보유 중 — 0개").</p>
 *
 * <p><b>결제 흐름</b>: {@link com.rich.sodam.service.AttendanceCreditChargeService}(출근권 충전소)와
 * 완전히 동일한 흐름 — 1) 주문 생성(PENDING) → 2) FE 토스 결제창 → paymentKey 획득 → 3) 서버
 * 승인(confirm): 금액 위변조 방지 + 멱등(이미 PAID면 그대로). 실제 지갑(패스) 연장은 이 서비스가
 * 직접 담당한다(출근권처럼 별도 지갑 서비스로 분리하지 않음 — 패스는 잔액 원장이 필요 없는 단순
 * "만료 시각" 모델이라 굳이 서비스를 나눌 이유가 없다).</p>
 *
 * <p><b>웹훅 이중 방어</b>: FE의 동기 {@link #confirm}과 {@code TossWebhookService}가 호출하는
 * {@link #applyFromWebhook}은 둘 다 {@link RecruitmentBoostPassOrderRepository#findByOrderIdForUpdate}
 * 비관적 락으로 같은 주문 행을 직렬화하고, {@link RecruitmentBoostPassOrder#isPaid()}를 먼저 확인해
 * 어느 경로가 먼저 도착해도 지급(연장)은 정확히 1회만 일어난다(재시도·중복 웹훅 멱등).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecruitmentBoostPassService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final RecruitmentBoostPassRepository passRepository;
    private final RecruitmentBoostPassOrderRepository orderRepository;
    private final RecruitmentBoostPassProperties properties;
    private final TossPaymentGateway paymentGateway;
    private final PaymentCancelReversalAuditRepository reversalAuditRepository;

    // ─────────────────────────────────────────────────────────────────
    // 과금 우회 판정 — JobOfferService/JobApplicationService 과금 훅에서 호출
    // ─────────────────────────────────────────────────────────────────

    /** 이 사장이 지금 시점 활성 무제한 패스를 보유했는지(§2.3 과금 우회 판정). */
    @Transactional(readOnly = true)
    public boolean hasActivePass(Long ownerUserId) {
        return passRepository.findByOwnerUserId(ownerUserId)
                .map(pass -> pass.isActive(LocalDateTime.now(SEOUL)))
                .orElse(false);
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/recruitment-boost-passes/me
    // ─────────────────────────────────────────────────────────────────

    public record Summary(boolean active, LocalDateTime activeUntil, int remainingDays,
                           List<RecruitmentBoostPassProperties.ProductQuote> products) {
    }

    @Transactional(readOnly = true)
    public Summary getSummary(Long ownerUserId) {
        LocalDateTime now = LocalDateTime.now(SEOUL);
        RecruitmentBoostPass pass = passRepository.findByOwnerUserId(ownerUserId).orElse(null);
        boolean active = pass != null && pass.isActive(now);
        LocalDateTime activeUntil = active ? pass.getActiveUntil() : null;
        int remainingDays = active ? remainingDaysCeil(now, activeUntil) : 0;
        return new Summary(active, activeUntil, remainingDays, properties.allQuotes());
    }

    private int remainingDaysCeil(LocalDateTime now, LocalDateTime activeUntil) {
        long secondsLeft = Duration.between(now, activeUntil).getSeconds();
        if (secondsLeft <= 0) {
            return 0;
        }
        return (int) Math.ceil(secondsLeft / 86_400.0);
    }

    // ─────────────────────────────────────────────────────────────────
    // 주문 생성 / 승인
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public RecruitmentBoostPassOrder createOrder(Long ownerUserId, RecruitmentBoostPassProductCode productCode) {
        RecruitmentBoostPassProperties.ProductQuote quote = properties.quote(productCode);
        String orderId = "RBP_" + ownerUserId + "_" + UUID.randomUUID().toString().substring(0, 12);
        RecruitmentBoostPassOrder order = RecruitmentBoostPassOrder.create(
                ownerUserId, productCode, orderId, quote.priceKrw(), quote.durationDays());
        return orderRepository.save(order);
    }

    /**
     * 결제 승인(FE 동기 호출). 금액은 <b>서버 보관 주문 금액</b>으로 검증(클라이언트 금액 신뢰 금지).
     */
    @Transactional
    public RecruitmentBoostPassOrder confirm(Long ownerUserId, String orderId, String paymentKey, int clientAmount) {
        RecruitmentBoostPassOrder order = orderRepository.findByOrderIdForUpdate(orderId)
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
     * 웹훅 DONE 백업 경로 — FE의 동기 confirm 호출이 유실됐을 때를 대비한 안전망
     * ({@code AttendanceCreditChargeService.applyFromWebhook}과 동일 원칙). orderId 로 조회해 아직
     * PAID 가 아니면 지급(연장)을 마저 반영하고, 이미 PAID/취소·환불이면 조용히 스킵한다(멱등).
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
     * 웹훅 취소/실패 경로. 아직 지급 전(PENDING)이면 그냥 CANCELLED 처리(미지급 보장). 이미
     * 지급된(PAID) 주문이 뒤늦게 취소/환불되면 {@link RecruitmentBoostPass#reverseBestEffort}로
     * 최선노력 회수한다 — 이때 구매 일수 전체가 아니라 {@code cancelInfo}로 해석한 취소 비율만큼만
     * 비례 회수한다(recruitment-monetization-gamification-plan.md §12.2, 부분환불이 전액환불과
     * 동일하게 처리되던 문제 수정). 정확한 환불 정책(일할 계산 등)은 여전히 인간 확인 필요 —
     * {@link RecruitmentBoostPass} 클래스 javadoc 참고. 회수 결과는 감사 로그(DB)에 남긴다.
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
                TossCancelProration.Proration dayProration = TossCancelProration.prorate(
                        cancelInfo, order.getAmountKrw(), order.getDurationDays());
                log.info("무제한 패스 주문 결제취소(웹훅) — 지급분 회수 시도 orderId={} status={} 취소비율={} 회수요청(일)={}",
                        orderId, reasonStatus, dayProration.cancelRatio(), dayProration.proratedQuantity());

                int actualDaysReversed = passRepository.findByOwnerUserIdForUpdate(order.getOwnerUserId())
                        .map(pass -> pass.reverseBestEffort(dayProration.proratedQuantity()))
                        .orElse(0);

                reversalAuditRepository.save(PaymentCancelReversalAudit.of(
                        PaymentCancelReversalAudit.OrderType.RECRUITMENT_BOOST_PASS, order.getOrderId(),
                        order.getOwnerUserId(), reasonStatus, order.getAmountKrw(), dayProration.resolvedCancelAmountKrw(),
                        dayProration.cancelRatio(), PaymentCancelReversalAudit.QuantityUnit.BOOST_PASS_DAY,
                        dayProration.proratedQuantity(), actualDaysReversed));

                order.markRefunded();
            } else {
                order.markCancelled();
            }
            orderRepository.save(order);
        });
    }

    @Transactional(readOnly = true)
    public List<RecruitmentBoostPassOrder> myOrders(Long ownerUserId) {
        return orderRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }

    /**
     * 실제 지급(연장) 반영 — {@link #confirm}(동기)과 {@link #applyFromWebhook}(비동기 백업) 둘 다 이
     * 메서드로 수렴한다. 호출자는 반드시 {@code findByOrderIdForUpdate}로 주문 락을 쥔 상태여야 한다.
     */
    private void applyPaidOrder(RecruitmentBoostPassOrder order, String paymentKey) {
        if (order.isPaid()) {
            return; // 이중 방어(호출자가 이미 체크하지만, 이 메서드 단독으로도 멱등해야 안전)
        }
        RecruitmentBoostPass pass = passRepository.findByOwnerUserIdForUpdate(order.getOwnerUserId())
                .orElseGet(() -> passRepository.save(RecruitmentBoostPass.openFor(order.getOwnerUserId())));
        LocalDateTime now = LocalDateTime.now(SEOUL);
        pass.extend(now, order.getDurationDays());
        passRepository.save(pass);

        order.markPaid(paymentKey);
        orderRepository.save(order);
        log.info("무제한 패스 결제완료 orderId={} product={} 연장 후 만료일={}",
                order.getOrderId(), order.getProductCode(), pass.getActiveUntil());
    }
}
