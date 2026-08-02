package com.rich.sodam.service;

import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditChargeOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.AttendanceCreditChargeOrderRepository;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 토스 웹훅이 출근권 충전 주문까지 정확히 라우팅되는지(orderId 기반) + 재시도/중복 수신 멱등을
 * {@code processWebhookPayload} 실제 진입점 레벨에서 검증한다(recruitment-monetization-gamification-plan.md
 * §7). 개별 지급/회수 로직 자체의 세부 케이스는 {@code AttendanceCreditChargeServiceTest} 참고 —
 * 여기는 "웹훅 JSON payload → 올바른 주문/지갑 반영"이라는 배선(wiring)만 확인한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TossWebhookServiceAttendanceCreditTest {

    @Autowired private TossWebhookService webhookService;
    @Autowired private AttendanceCreditChargeService chargeService;
    @Autowired private AttendanceCreditChargeOrderRepository orderRepo;
    @Autowired private AttendanceCreditRepository walletRepo;
    @Autowired private UserRepository userRepo;

    private int emailSeq = 0;

    private User master() {
        User u = new User("toss_webhook_acc_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private String donePayload(String orderId, String paymentKey) {
        return "{\"eventType\":\"PAYMENT_STATUS_CHANGED\",\"data\":{"
                + "\"paymentKey\":\"" + paymentKey + "\","
                + "\"orderId\":\"" + orderId + "\","
                + "\"status\":\"DONE\"}}";
    }

    private String canceledPayload(String orderId, String paymentKey) {
        return "{\"eventType\":\"PAYMENT_STATUS_CHANGED\",\"data\":{"
                + "\"paymentKey\":\"" + paymentKey + "\","
                + "\"orderId\":\"" + orderId + "\","
                + "\"status\":\"CANCELED\"}}";
    }

    /** 실제 토스 Payment 객체 구조(cancels 배열 + balanceAmount)를 재현한 부분취소 payload. */
    private String partialCanceledPayload(String orderId, String paymentKey, int totalAmount, int cancelAmount) {
        int balanceAmount = totalAmount - cancelAmount;
        return "{\"eventType\":\"PAYMENT_STATUS_CHANGED\",\"data\":{"
                + "\"paymentKey\":\"" + paymentKey + "\","
                + "\"orderId\":\"" + orderId + "\","
                + "\"status\":\"PARTIAL_CANCELED\","
                + "\"totalAmount\":" + totalAmount + ","
                + "\"balanceAmount\":" + balanceAmount + ","
                + "\"cancels\":[{\"cancelAmount\":" + cancelAmount + "}]}}";
    }

    @Test
    @DisplayName("웹훅 DONE 수신 시 orderId로 충전 주문을 찾아 지급까지 반영된다(동기 confirm 없이 웹훅 단독)")
    void webhookDone_grantsAttendanceCredit() throws Exception {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(20); // 첫구매 2배(스몰팩 10 → 20)
        AttendanceCreditChargeOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.isPaid()).isTrue();
    }

    @Test
    @DisplayName("같은 DONE 웹훅이 재시도로 중복 수신돼도 이중 지급되지 않는다(재시도 멱등)")
    void webhookDone_duplicateRetry_doesNotDoubleGrant() throws Exception {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));
        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1")); // 토스 웹훅 재시도 재현
        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(20); // 3번 수신해도 20 그대로
    }

    @Test
    @DisplayName("결제 전 취소 웹훅(ABORTED류)은 지급 없이 주문만 취소 처리한다 — 미지급 보장")
    void webhookCanceled_beforePaid_noGrant() throws Exception {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        webhookService.processWebhookPayload(canceledPayload(order.getOrderId(), "PK_NEVER_CHARGED"));

        assertThat(walletRepo.findByOwnerUserId(owner.getId())).isEmpty();
        AttendanceCreditChargeOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(AttendanceCreditChargeOrder.ChargeOrderStatus.CANCELLED);
    }

    @Test
    @DisplayName("지급 완료 후 취소 웹훅이 오면 지급분을 회수(claw-back)한다")
    void webhookCanceled_afterPaid_reversesCredit() throws Exception {
        User owner = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);
        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));
        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isEqualTo(20);

        webhookService.processWebhookPayload(canceledPayload(order.getOrderId(), "PK_WEBHOOK_1"));

        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isZero();
    }

    @Test
    @DisplayName("존재하지 않는 orderId(예: 구독 결제용 payload)를 받아도 예외 없이 무시한다")
    void webhook_unknownOrderId_isIgnoredSafely() throws Exception {
        webhookService.processWebhookPayload(donePayload("SUBSCRIPTION_ORDER_NOT_OURS", "PK_X"));
        // 예외 없이 통과하면 성공 — 출근권 관련 부작용이 없어야 한다(다른 도메인 orderId를 잘못 건드리지 않음).
    }

    @Test
    @DisplayName("웹훅 payload의 cancels[].cancelAmount를 실제로 파싱해 취소비율만큼만 비례 회수한다(50% 부분취소)")
    void webhookPartialCanceled_reversesProratedAmount() throws Exception {
        User owner = master();
        // 라지 팩: 기본 120 + 첫구매 보너스 120 = 총 240개, 15,900원
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.LARGE);
        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));
        assertThat(walletRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isEqualTo(240);

        webhookService.processWebhookPayload(
                partialCanceledPayload(order.getOrderId(), "PK_WEBHOOK_1", 15_900, 7_950)); // 정확히 50% 취소

        AttendanceCredit wallet = walletRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(wallet.getBalance()).isEqualTo(120); // 전량(240) 회수가 아니라 절반(120)만 회수
    }
}
