package com.rich.sodam.service;

import com.rich.sodam.config.integration.TossCancelProration;
import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditChargeOrder;
import com.rich.sodam.domain.PaymentCancelReversalAudit;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.AttendanceCreditChargeOrderRepository;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.AttendanceCreditTransactionRepository;
import com.rich.sodam.repository.PaymentCancelReversalAuditRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 출근권 충전소(IAP) 통합 테스트 — 결제 성공 지급, 첫 구매 2배 이벤트, 결제 실패/중복콜백/웹훅
 * 취소·환불 시 잔액 오지급 방지(recruitment-monetization-gamification-plan.md §2.4, §7).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceCreditChargeServiceTest {

    @Autowired private AttendanceCreditChargeService chargeService;
    @Autowired private AttendanceCreditRepository walletRepo;
    @Autowired private AttendanceCreditTransactionRepository transactionRepo;
    @Autowired private AttendanceCreditChargeOrderRepository orderRepo;
    @Autowired private PaymentCancelReversalAuditRepository reversalAuditRepo;
    @Autowired private UserRepository userRepo;

    private int emailSeq = 0;

    private User master() {
        User u = new User("attendance_credit_charge_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    // ─────────────────────────────────────────────────────────────────
    // 정상 결제 → 지급
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("주문 생성 → 결제 승인 → PAID, 설정값 수량만큼 출근권 무기한 지급(첫구매라 2배 적용)")
    void createThenConfirm_grantsCreditsWithFirstPurchaseBonus() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        assertThat(order.getStatus()).isEqualTo(AttendanceCreditChargeOrder.ChargeOrderStatus.PENDING);
        assertThat(order.getCreditQuantity()).isEqualTo(10); // 기본 스몰 팩 수량(설정값 기본값)
        assertThat(order.getAmountKrw()).isEqualTo(1_900);

        AttendanceCreditChargeOrder paid = chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        assertThat(paid.isPaid()).isTrue();
        assertThat(paid.getBonusCreditQuantity()).isEqualTo(10); // 첫구매 2배 → 보너스로 기본수량만큼 추가
        assertThat(paid.totalCreditQuantity()).isEqualTo(20);

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(20);
        assertThat(wallet.hasFirstChargeBonusAvailable()).isFalse();
    }

    @Test
    @DisplayName("두 번째 충전(같은 사장)은 첫구매 이벤트가 이미 소진돼 보너스 없이 기본 수량만 지급된다")
    void secondCharge_noBonus() {
        User owner = master();
        AttendanceCreditChargeOrder first = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        chargeService.confirm(owner.getId(), first.getOrderId(), "PK_1", first.getAmountKrw());

        AttendanceCreditChargeOrder second = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.MEDIUM);
        AttendanceCreditChargeOrder paidSecond = chargeService.confirm(owner.getId(), second.getOrderId(), "PK_2", second.getAmountKrw());

        assertThat(paidSecond.getBonusCreditQuantity()).isZero();
        assertThat(paidSecond.totalCreditQuantity()).isEqualTo(50); // 미디엄 팩 기본 수량만

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(20 /* 첫구매(2배) */ + 50 /* 두번째(보너스없음) */);
    }

    @Test
    @DisplayName("스트릭 복구권 단독 구매는 재화가 아니라 첫구매 보너스 대상이 아니고, 잔액이 아닌 티켓 카운터만 증가한다")
    void streakRecoveryPack_grantsTicketOnly_noBonusNoLedgerPollution() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.STREAK_RECOVERY);
        assertThat(order.getCreditQuantity()).isZero();
        assertThat(order.getTicketQuantity()).isEqualTo(1);
        assertThat(order.getAmountKrw()).isEqualTo(900);

        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isZero(); // 재화 잔액은 그대로
        assertThat(wallet.getStreakRecoveryTickets()).isEqualTo(1);
        assertThat(wallet.hasFirstChargeBonusAvailable()).isTrue(); // 아직 "재화 포함" 첫 구매를 안 함

        // 재화 원장(FIFO 소모 대상 lot)에는 아무 것도 남기지 않는다 — 소모 로직 오염 방지
        assertThat(transactionRepo.findAll().stream().filter(t -> t.getOwnerUserId().equals(owner.getId()))).isEmpty();
    }

    // ─────────────────────────────────────────────────────────────────
    // 위변조/권한 방지
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("결제 금액이 주문 금액과 다르면 거부(위변조 방지) — 잔액 변화 없음")
    void rejectsAmountTampering() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        assertThatThrownBy(() -> chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", 100))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(walletRepo.findByOwnerUserId(owner.getId())).isEmpty();
    }

    @Test
    @DisplayName("타인 주문은 결제할 수 없다")
    void rejectsForeignOrder() {
        User owner = master();
        User other = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        assertThatThrownBy(() -> chargeService.confirm(other.getId(), order.getOrderId(), "PK", order.getAmountKrw()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(walletRepo.findByOwnerUserId(owner.getId())).isEmpty();
    }

    // ─────────────────────────────────────────────────────────────────
    // 결제 실패(게이트웨이 거절) — MockTossPaymentGateway는 orderId가 "FAIL_"로 시작하면 실패 응답
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("게이트웨이 승인 실패 시 예외 + 지급되지 않고 주문도 PENDING 그대로 유지")
    void gatewayDeclines_grantsNothing() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        // Mock 게이트웨이의 "FAIL_" 접두 규약을 재현하기 위해 orderId를 직접 변조(테스트 전용).
        ReflectionTestUtils.setField(order, "orderId", "FAIL_" + order.getOrderId());
        orderRepo.saveAndFlush(order);

        assertThatThrownBy(() -> chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(walletRepo.findByOwnerUserId(owner.getId())).isEmpty();
        AttendanceCreditChargeOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.isPending()).isTrue();
    }

    // ─────────────────────────────────────────────────────────────────
    // 중복 콜백 멱등 — 동기 confirm 두 번 / confirm 후 웹훅 DONE 재수신
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("같은 주문을 confirm 2번 호출해도 지급은 1회만 — 잔액이 두 배로 늘지 않는다")
    void confirm_calledTwice_idempotent() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(20); // 20 그대로, 40으로 이중지급되지 않음
    }

    @Test
    @DisplayName("동기 confirm 후 웹훅 DONE이 재수신돼도(백업 경로) 이중 지급되지 않는다")
    void applyFromWebhook_afterSyncConfirm_doesNotDoubleGrant() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        chargeService.applyFromWebhook(order.getOrderId(), "PK_1"); // 토스가 웹훅을 뒤늦게 또 보낸 상황 재현

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(20);
    }

    @Test
    @DisplayName("웹훅 DONE이 동기 confirm보다 먼저 도착해도(백업 경로 단독) 정상 지급되고, 이후 동기 confirm은 멱등하게 스킵된다")
    void applyFromWebhook_beforeSyncConfirm_grantsOnce() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        chargeService.applyFromWebhook(order.getOrderId(), "PK_WEBHOOK");
        AttendanceCredit afterWebhook = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(afterWebhook.getBalance()).isEqualTo(20);

        AttendanceCreditChargeOrder confirmed = chargeService.confirm(owner.getId(), order.getOrderId(), "PK_WEBHOOK", order.getAmountKrw());
        assertThat(confirmed.isPaid()).isTrue();
        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(20); // 여전히 20 — 이중지급 없음
    }

    // ─────────────────────────────────────────────────────────────────
    // 웹훅 취소/환불 — 미지급 보장 / 최선노력 회수
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("결제 전(PENDING) 주문에 취소 웹훅이 오면 CANCELLED로만 전이되고 잔액은 애초에 건드리지 않는다(미지급 보장)")
    void cancelFromWebhook_beforePaid_noGrantHappened() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        chargeService.cancelFromWebhook(order.getOrderId(), "ABORTED", TossCancelProration.ParsedCancelAmount.EMPTY);

        assertThat(walletRepo.findByOwnerUserId(owner.getId())).isEmpty();
        AttendanceCreditChargeOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(AttendanceCreditChargeOrder.ChargeOrderStatus.CANCELLED);

        // 이후 같은 주문으로 결제 승인 재시도는 거부된다(취소된 주문 재사용 방지)
        assertThatThrownBy(() -> chargeService.confirm(owner.getId(), order.getOrderId(), "PK", order.getAmountKrw()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("이미 지급된 주문에 취소 웹훅이 오고 아직 소모 전이면 지급분을 전액 회수한다")
    void cancelFromWebhook_afterPaid_fullBalance_clawsBackFully() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isEqualTo(20);

        chargeService.cancelFromWebhook(order.getOrderId(), "CANCELED", TossCancelProration.ParsedCancelAmount.EMPTY);

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isZero();
        AttendanceCreditChargeOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(AttendanceCreditChargeOrder.ChargeOrderStatus.REFUNDED);
    }

    @Test
    @DisplayName("이미 일부를 소모한 뒤 취소 웹훅이 오면 남은 잔액 한도 내에서만 회수하고 0 밑으로 내려가지 않는다")
    void cancelFromWebhook_afterPartialConsumption_clampsAtZero() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.MEDIUM); // 지급 50(+50 첫구매 보너스)=100
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        AttendanceCredit walletAfterCharge = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(walletAfterCharge.getBalance()).isEqualTo(100);

        // 90개를 다른 용도로 이미 써버린 상황을 재현(직접 잔액을 낮춰 시뮬레이션 — 실제로는 소모 API 경유)
        ReflectionTestUtils.setField(walletAfterCharge, "balance", 10);
        walletRepo.saveAndFlush(walletAfterCharge);

        chargeService.cancelFromWebhook(order.getOrderId(), "CANCELED", TossCancelProration.ParsedCancelAmount.EMPTY); // 회수 요청 100, 남은 건 10뿐

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isZero(); // 0 밑으로 내려가지 않고 있는 만큼만 회수
    }

    @Test
    @DisplayName("취소 웹훅 중복 수신(멱등) — 이미 REFUNDED 처리된 주문은 두 번째 호출에서 잔액을 추가로 건드리지 않는다")
    void cancelFromWebhook_duplicateCall_idempotent() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        chargeService.cancelFromWebhook(order.getOrderId(), "CANCELED", TossCancelProration.ParsedCancelAmount.EMPTY);
        AttendanceCredit afterFirstCancel = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(afterFirstCancel.getBalance()).isZero();

        // 이후 사장이 새로 체크인/충전으로 잔액이 다시 쌓였다고 가정 — 중복 취소 웹훅이 이 잔액까지
        // 잘못 건드리면 안 된다.
        ReflectionTestUtils.setField(afterFirstCancel, "balance", 5);
        walletRepo.saveAndFlush(afterFirstCancel);

        chargeService.cancelFromWebhook(order.getOrderId(), "CANCELED", TossCancelProration.ParsedCancelAmount.EMPTY); // 재수신(멱등해야 함)

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(5); // 중복 처리로 또 깎이지 않음
    }

    // ─────────────────────────────────────────────────────────────────
    // 부분취소 비례 회수 — recruitment-monetization-gamification-plan.md §12.2
    // (환불금액과 회수량이 연동되지 않던 문제 수정 검증)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("50% 부분취소 웹훅은 지급 수량의 절반만 회수한다(취소비율 연동)")
    void cancelFromWebhook_partialCancel_reversesProratedHalf() {
        User owner = master();
        // 라지 팩: 기본 120 + 첫구매 보너스 120 = 총 240개, 15,900원
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.LARGE);
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        AttendanceCredit walletAfterCharge = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(walletAfterCharge.getBalance()).isEqualTo(240);

        // 원금 15,900원 중 7,950원만 취소(정확히 50%)
        TossCancelProration.ParsedCancelAmount halfCancel = new TossCancelProration.ParsedCancelAmount(7_950, 7_950);
        chargeService.cancelFromWebhook(order.getOrderId(), "PARTIAL_CANCELED", halfCancel);

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(120); // 240 - (240 * 50%) = 120만 회수됨(전량 회수 아님)

        java.util.List<PaymentCancelReversalAudit> audits = reversalAuditRepo.findByOrderIdOrderByCreatedAtDesc(order.getOrderId());
        PaymentCancelReversalAudit creditAudit = audits.stream()
                .filter(a -> a.getQuantityUnit() == PaymentCancelReversalAudit.QuantityUnit.CREDIT)
                .findFirst().orElseThrow();
        assertThat(creditAudit.getRequestedReverseQuantity()).isEqualTo(120);
        assertThat(creditAudit.getActualReverseQuantity()).isEqualTo(120);
        assertThat(creditAudit.getCancelRatio()).isEqualByComparingTo(new java.math.BigDecimal("0.500000"));
        assertThat(creditAudit.getOriginalAmountKrw()).isEqualTo(15_900);
        assertThat(creditAudit.getResolvedCancelAmountKrw()).isEqualTo(7_950);
    }

    @Test
    @DisplayName("balanceAmount만 있고 cancelAmount가 없어도 원금에서 역산해 동일하게 비례 회수한다")
    void cancelFromWebhook_partialCancel_derivedFromBalanceAmount() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.LARGE);
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        // cancelAmount 없이 balanceAmount(남은 미취소 금액)만 있는 payload — 15,900 - 3,975 = 11,925 취소(75%)
        TossCancelProration.ParsedCancelAmount viaBalance = new TossCancelProration.ParsedCancelAmount(null, 3_975);
        chargeService.cancelFromWebhook(order.getOrderId(), "PARTIAL_CANCELED", viaBalance);

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        // 240 * 75% = 180 회수 → 남은 잔액 60
        assertThat(wallet.getBalance()).isEqualTo(60);
    }

    @Test
    @DisplayName("전액취소(비율 100%)는 기존과 동일하게 전량 회수한다")
    void cancelFromWebhook_fullCancel_stillReversesAll() {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        chargeService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isEqualTo(20);

        TossCancelProration.ParsedCancelAmount fullCancel = new TossCancelProration.ParsedCancelAmount(1_900, 0);
        chargeService.cancelFromWebhook(order.getOrderId(), "CANCELED", fullCancel);

        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isZero();
    }
}
