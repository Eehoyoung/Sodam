package com.rich.sodam.service;

import com.rich.sodam.domain.RecruitmentBoostPass;
import com.rich.sodam.domain.RecruitmentBoostPassOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.RecruitmentBoostPassOrderRepository;
import com.rich.sodam.repository.RecruitmentBoostPassRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 토스 웹훅이 무제한 패스 주문까지 정확히 라우팅되는지(orderId 기반) + 재시도/중복 수신 멱등을
 * {@code processWebhookPayload} 실제 진입점 레벨에서 검증한다(recruitment-monetization-gamification-plan.md
 * §7). {@code TossWebhookServiceAttendanceCreditTest}(출근권 충전)의 무제한 패스 버전 — 웹훅 하나로
 * 두 주문 타입을 순서대로 시도해도 서로 간섭하지 않는지(orderId 스페이스 분리) 함께 확인한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TossWebhookServiceRecruitmentBoostPassTest {

    @Autowired private TossWebhookService webhookService;
    @Autowired private RecruitmentBoostPassService passService;
    @Autowired private RecruitmentBoostPassOrderRepository orderRepo;
    @Autowired private RecruitmentBoostPassRepository passRepo;
    @Autowired private UserRepository userRepo;

    private int emailSeq = 0;

    private User master() {
        User u = new User("toss_webhook_rbp_owner" + (emailSeq++) + "@x.com", "사장");
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
    @DisplayName("웹훅 DONE 수신 시 orderId로 패스 주문을 찾아 활성화까지 반영된다(동기 confirm 없이 웹훅 단독)")
    void webhookDone_activatesPass() throws Exception {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));

        RecruitmentBoostPass pass = passRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(pass.isActive(java.time.LocalDateTime.now())).isTrue();
        RecruitmentBoostPassOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.isPaid()).isTrue();
    }

    @Test
    @DisplayName("같은 DONE 웹훅이 재시도로 중복 수신돼도 이중 연장되지 않는다(재시도 멱등)")
    void webhookDone_duplicateRetry_doesNotDoubleExtend() throws Exception {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));
        java.time.LocalDateTime afterFirst = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));
        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));

        java.time.LocalDateTime afterRetries = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        assertThat(afterRetries).isEqualTo(afterFirst); // 3번 수신해도 3일 그대로(9일로 늘지 않음)
    }

    @Test
    @DisplayName("결제 전 취소 웹훅(ABORTED류)은 활성화 없이 주문만 취소 처리한다 — 미지급 보장")
    void webhookCanceled_beforePaid_noActivation() throws Exception {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        webhookService.processWebhookPayload(canceledPayload(order.getOrderId(), "PK_NEVER_CHARGED"));

        assertThat(passRepo.findByOwnerUserId(owner.getId())).isEmpty();
        RecruitmentBoostPassOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(RecruitmentBoostPassOrder.PassOrderStatus.CANCELLED);
    }

    @Test
    @DisplayName("활성화 완료 후 취소 웹훅이 오면 지급분(기간)을 회수(claw-back)한다")
    void webhookCanceled_afterPaid_reversesDuration() throws Exception {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));
        assertThat(passRepo.findByOwnerUserId(owner.getId()).orElseThrow().isActive(java.time.LocalDateTime.now())).isTrue();

        webhookService.processWebhookPayload(canceledPayload(order.getOrderId(), "PK_WEBHOOK_1"));

        assertThat(passRepo.findByOwnerUserId(owner.getId()).orElseThrow().isActive(java.time.LocalDateTime.now())).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 orderId(예: 구독 결제용 payload)를 받아도 예외 없이 무시한다")
    void webhook_unknownOrderId_isIgnoredSafely() throws Exception {
        webhookService.processWebhookPayload(donePayload("SUBSCRIPTION_ORDER_NOT_OURS", "PK_X"));
        // 예외 없이 통과하면 성공 — 무제한 패스 관련 부작용이 없어야 한다.
    }

    @Test
    @DisplayName("웹훅 payload의 cancels[].cancelAmount를 실제로 파싱해 취소비율만큼만 비례 회수한다(50% 부분취소)")
    void webhookPartialCanceled_reversesProratedDays() throws Exception {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.SEVEN_DAY);
        webhookService.processWebhookPayload(donePayload(order.getOrderId(), "PK_WEBHOOK_1"));
        java.time.LocalDateTime afterActivation = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        webhookService.processWebhookPayload(
                partialCanceledPayload(order.getOrderId(), "PK_WEBHOOK_1", order.getAmountKrw(), order.getAmountKrw() / 2));

        java.time.LocalDateTime afterPartialCancel = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        // 7일 중 절반(버림) = 3일만 회수 — 전체 7일이 아니다.
        assertThat(afterPartialCancel).isEqualTo(afterActivation.minusDays(3));
        assertThat(passRepo.findByOwnerUserId(owner.getId()).orElseThrow().isActive(java.time.LocalDateTime.now())).isTrue();
    }
}
