package com.rich.sodam.service;

import com.rich.sodam.config.integration.TossCancelProration;
import com.rich.sodam.domain.PaymentCancelReversalAudit;
import com.rich.sodam.domain.RecruitmentBoostPass;
import com.rich.sodam.domain.RecruitmentBoostPassOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.PaymentCancelReversalAuditRepository;
import com.rich.sodam.repository.RecruitmentBoostPassOrderRepository;
import com.rich.sodam.repository.RecruitmentBoostPassRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 채용 부스트 무제한 패스 통합 테스트 — 결제 성공 시 스택형 연장, 중복콜백/웹훅 취소·환불 시
 * 오연장/오회수 방지(recruitment-monetization-gamification-plan.md §2.5, §7).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RecruitmentBoostPassServiceTest {

    @Autowired private RecruitmentBoostPassService passService;
    @Autowired private RecruitmentBoostPassRepository passRepo;
    @Autowired private RecruitmentBoostPassOrderRepository orderRepo;
    @Autowired private PaymentCancelReversalAuditRepository reversalAuditRepo;
    @Autowired private UserRepository userRepo;

    private int emailSeq = 0;

    private User master() {
        User u = new User("boost_pass_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    // ─────────────────────────────────────────────────────────────────
    // 정상 결제 → 연장
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("주문 생성 → 결제 승인 → PAID, 설정값 기간만큼(3일) 연장되어 활성화된다")
    void createThenConfirm_activatesPass() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        assertThat(order.getStatus()).isEqualTo(RecruitmentBoostPassOrder.PassOrderStatus.PENDING);
        assertThat(order.getDurationDays()).isEqualTo(3);
        assertThat(order.getAmountKrw()).isEqualTo(9_900);

        RecruitmentBoostPassOrder paid = passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        assertThat(paid.isPaid()).isTrue();
        RecruitmentBoostPass pass = passRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        assertThat(pass.isActive(LocalDateTime.now())).isTrue();
        long daysLeft = ChronoUnit.HOURS.between(LocalDateTime.now(), pass.getActiveUntil());
        assertThat(daysLeft).isBetween(3 * 24L - 1, 3 * 24L); // 3일(±약간의 실행오차)

        assertThat(passService.hasActivePass(owner.getId())).isTrue();
    }

    @Test
    @DisplayName("이미 활성인 상태에서 추가 구매(연장)하면 지금이 아니라 남은 기간 뒤에 이어붙인다(스택형)")
    void secondPurchase_whileActive_stacksOnRemainingPeriod() {
        User owner = master();
        RecruitmentBoostPassOrder first = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.SEVEN_DAY);
        passService.confirm(owner.getId(), first.getOrderId(), "PK_1", first.getAmountKrw());
        LocalDateTime afterFirst = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        RecruitmentBoostPassOrder second = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        passService.confirm(owner.getId(), second.getOrderId(), "PK_2", second.getAmountKrw());
        LocalDateTime afterSecond = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        // 스택형이므로 두번째 구매는 "지금+3일"이 아니라 "첫 구매 만료일+3일"이어야 한다.
        assertThat(afterSecond).isEqualTo(afterFirst.plusDays(3));
    }

    @Test
    @DisplayName("이미 만료된 뒤 다시 구매하면 만료 시점이 아니라 지금부터 계산된다")
    void purchase_afterExpiry_startsFromNow() {
        User owner = master();
        RecruitmentBoostPassOrder first = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        passService.confirm(owner.getId(), first.getOrderId(), "PK_1", first.getAmountKrw());

        RecruitmentBoostPass pass = passRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        ReflectionTestUtils.setField(pass, "activeUntil", LocalDateTime.now().minusDays(10)); // 이미 만료된 상태로 재현
        passRepo.saveAndFlush(pass);
        assertThat(passService.hasActivePass(owner.getId())).isFalse();

        RecruitmentBoostPassOrder second = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.SEVEN_DAY);
        passService.confirm(owner.getId(), second.getOrderId(), "PK_2", second.getAmountKrw());

        LocalDateTime activeUntil = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        long hoursLeft = ChronoUnit.HOURS.between(LocalDateTime.now(), activeUntil);
        assertThat(hoursLeft).isBetween(7 * 24L - 1, 7 * 24L); // 만료된 과거값이 아니라 지금부터 7일
    }

    // ─────────────────────────────────────────────────────────────────
    // 위변조/권한 방지
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("결제 금액이 주문 금액과 다르면 거부(위변조 방지) — 패스가 활성화되지 않는다")
    void rejectsAmountTampering() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        assertThatThrownBy(() -> passService.confirm(owner.getId(), order.getOrderId(), "PK_1", 100))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(passRepo.findByOwnerUserId(owner.getId())).isEmpty();
    }

    @Test
    @DisplayName("타인 주문은 결제할 수 없다")
    void rejectsForeignOrder() {
        User owner = master();
        User other = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        assertThatThrownBy(() -> passService.confirm(other.getId(), order.getOrderId(), "PK", order.getAmountKrw()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(passRepo.findByOwnerUserId(owner.getId())).isEmpty();
    }

    @Test
    @DisplayName("게이트웨이 승인 실패 시 예외 + 활성화되지 않고 주문도 PENDING 그대로 유지")
    void gatewayDeclines_activatesNothing() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        ReflectionTestUtils.setField(order, "orderId", "FAIL_" + order.getOrderId());
        orderRepo.saveAndFlush(order);

        assertThatThrownBy(() -> passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(passRepo.findByOwnerUserId(owner.getId())).isEmpty();
        RecruitmentBoostPassOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.isPending()).isTrue();
    }

    // ─────────────────────────────────────────────────────────────────
    // 중복 콜백 멱등 — 동기 confirm 두 번 / confirm 후 웹훅 DONE 재수신
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("같은 주문을 confirm 2번 호출해도 연장은 1회만 — 만료일이 두 배로 늘지 않는다")
    void confirm_calledTwice_idempotent() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        LocalDateTime afterFirstConfirm = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        LocalDateTime afterSecondConfirm = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        assertThat(afterSecondConfirm).isEqualTo(afterFirstConfirm); // 6일로 늘지 않고 3일 그대로
    }

    @Test
    @DisplayName("동기 confirm 후 웹훅 DONE이 재수신돼도(백업 경로) 이중 연장되지 않는다")
    void applyFromWebhook_afterSyncConfirm_doesNotDoubleExtend() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        LocalDateTime afterConfirm = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        passService.applyFromWebhook(order.getOrderId(), "PK_1");

        LocalDateTime afterWebhook = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        assertThat(afterWebhook).isEqualTo(afterConfirm);
    }

    @Test
    @DisplayName("웹훅 DONE이 동기 confirm보다 먼저 도착해도(백업 경로 단독) 정상 활성화되고, 이후 동기 confirm은 멱등하게 스킵된다")
    void applyFromWebhook_beforeSyncConfirm_activatesOnce() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        passService.applyFromWebhook(order.getOrderId(), "PK_WEBHOOK");
        LocalDateTime afterWebhook = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        RecruitmentBoostPassOrder confirmed = passService.confirm(owner.getId(), order.getOrderId(), "PK_WEBHOOK", order.getAmountKrw());
        assertThat(confirmed.isPaid()).isTrue();
        LocalDateTime afterConfirm = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        assertThat(afterConfirm).isEqualTo(afterWebhook); // 이중 연장 없음
    }

    // ─────────────────────────────────────────────────────────────────
    // 웹훅 취소/환불
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("결제 전(PENDING) 주문에 취소 웹훅이 오면 CANCELLED로만 전이되고 패스는 애초에 만들어지지 않는다(미지급 보장)")
    void cancelFromWebhook_beforePaid_noActivationHappened() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        passService.cancelFromWebhook(order.getOrderId(), "ABORTED", TossCancelProration.ParsedCancelAmount.EMPTY);

        assertThat(passRepo.findByOwnerUserId(owner.getId())).isEmpty();
        RecruitmentBoostPassOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(RecruitmentBoostPassOrder.PassOrderStatus.CANCELLED);

        assertThatThrownBy(() -> passService.confirm(owner.getId(), order.getOrderId(), "PK", order.getAmountKrw()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("이미 활성화된 주문에 취소 웹훅이 오면 지급분(기간)을 최선노력으로 회수한다")
    void cancelFromWebhook_afterPaid_reversesBestEffort() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        LocalDateTime afterConfirm = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        passService.cancelFromWebhook(order.getOrderId(), "CANCELED", TossCancelProration.ParsedCancelAmount.EMPTY);

        LocalDateTime afterCancel = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        assertThat(afterCancel).isEqualTo(afterConfirm.minusDays(3));
        assertThat(passService.hasActivePass(owner.getId())).isFalse(); // 회수 후 다시 과거 시각이라 비활성
        RecruitmentBoostPassOrder reloaded = orderRepo.findByOrderId(order.getOrderId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(RecruitmentBoostPassOrder.PassOrderStatus.REFUNDED);
    }

    @Test
    @DisplayName("취소 웹훅 중복 수신(멱등) — 이미 REFUNDED 처리된 주문은 두 번째 호출에서 만료일을 추가로 건드리지 않는다")
    void cancelFromWebhook_duplicateCall_idempotent() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.SEVEN_DAY);
        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        passService.cancelFromWebhook(order.getOrderId(), "CANCELED", TossCancelProration.ParsedCancelAmount.EMPTY);
        LocalDateTime afterFirstCancel = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        passService.cancelFromWebhook(order.getOrderId(), "CANCELED", TossCancelProration.ParsedCancelAmount.EMPTY); // 재수신(멱등해야 함)

        LocalDateTime afterSecondCancel = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        assertThat(afterSecondCancel).isEqualTo(afterFirstCancel); // 중복 처리로 또 깎이지 않음
    }

    // ─────────────────────────────────────────────────────────────────
    // 부분취소 비례 회수 — recruitment-monetization-gamification-plan.md §12.2
    // (환불금액과 회수량이 연동되지 않던 문제 수정 검증)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("50% 부분취소 웹훅은 구매 일수의 절반만 회수한다(취소비율 연동)")
    void cancelFromWebhook_partialCancel_reversesProratedHalfDays() {
        User owner = master();
        // SEVEN_DAY: 7일, 가격은 카탈로그 기본값(예: 19,900원 수준) — 정확한 가격은 order.getAmountKrw()로 검증
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.SEVEN_DAY);
        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        LocalDateTime afterConfirm = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        int halfAmount = order.getAmountKrw() / 2; // 정확히 50%
        TossCancelProration.ParsedCancelAmount halfCancel =
                new TossCancelProration.ParsedCancelAmount(halfAmount, order.getAmountKrw() - halfAmount);
        passService.cancelFromWebhook(order.getOrderId(), "PARTIAL_CANCELED", halfCancel);

        LocalDateTime afterCancel = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        // 7일의 절반(정수 버림) = 3일만 회수 — 전체 7일을 회수하지 않는다.
        assertThat(afterCancel).isEqualTo(afterConfirm.minusDays(3));

        java.util.List<PaymentCancelReversalAudit> audits = reversalAuditRepo.findByOrderIdOrderByCreatedAtDesc(order.getOrderId());
        PaymentCancelReversalAudit dayAudit = audits.stream()
                .filter(a -> a.getQuantityUnit() == PaymentCancelReversalAudit.QuantityUnit.BOOST_PASS_DAY)
                .findFirst().orElseThrow();
        assertThat(dayAudit.getRequestedReverseQuantity()).isEqualTo(3);
        assertThat(dayAudit.getActualReverseQuantity()).isEqualTo(3);
        assertThat(dayAudit.getCancelRatio()).isEqualByComparingTo(new java.math.BigDecimal("0.500000"));
    }

    @Test
    @DisplayName("전액취소(비율 100%)는 기존과 동일하게 전체 일수를 회수한다")
    void cancelFromWebhook_fullCancel_stillReversesAllDays() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);
        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());
        LocalDateTime afterConfirm = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();

        TossCancelProration.ParsedCancelAmount fullCancel =
                new TossCancelProration.ParsedCancelAmount(order.getAmountKrw(), 0);
        passService.cancelFromWebhook(order.getOrderId(), "CANCELED", fullCancel);

        LocalDateTime afterCancel = passRepo.findByOwnerUserId(owner.getId()).orElseThrow().getActiveUntil();
        assertThat(afterCancel).isEqualTo(afterConfirm.minusDays(3));
    }

    // ─────────────────────────────────────────────────────────────────
    // 요약 조회 — D-day
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("활성 패스가 없으면 active=false, remainingDays=0, 상품 3종을 반환한다")
    void getSummary_noPass_returnsInactive() {
        User owner = master();
        RecruitmentBoostPassService.Summary summary = passService.getSummary(owner.getId());

        assertThat(summary.active()).isFalse();
        assertThat(summary.remainingDays()).isZero();
        assertThat(summary.products()).hasSize(3);
    }

    @Test
    @DisplayName("활성 패스가 있으면 active=true, remainingDays가 대략 남은 기간과 일치한다")
    void getSummary_activePass_returnsRemainingDays() {
        User owner = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THIRTY_DAY);
        passService.confirm(owner.getId(), order.getOrderId(), "PK_1", order.getAmountKrw());

        RecruitmentBoostPassService.Summary summary = passService.getSummary(owner.getId());

        assertThat(summary.active()).isTrue();
        assertThat(summary.remainingDays()).isEqualTo(30); // 방금 결제해서 정확히 30일 남음(올림 계산)
    }
}
