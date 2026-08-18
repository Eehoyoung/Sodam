package com.rich.sodam.domain;

import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 사장님(MASTER) 단위 구독 엔티티.
 * 한 사용자에 대해 ACTIVE 상태 구독은 동시에 최대 1건.
 */
@Entity
@Table(name = "subscription", indexes = {
        @Index(name = "idx_subscription_user", columnList = "user_id"),
        @Index(name = "idx_subscription_status", columnList = "status"),
        @Index(name = "idx_subscription_next_billing", columnList = "nextBillingAt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subscription_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlanType plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status;

    /** 청구 주기(월/반년/연). 연·반년납은 선결제 할인. */
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    /** 토스페이먼츠 빌링키 (카드 식별자). 실 카드번호는 절대 저장 X. */
    @Column(name = "billing_key", length = 200)
    private String billingKey;

    /** 카드 마스킹 표시용 (예: "신한카드 5678") — 사용자에게 보여줄 안전 텍스트만. */
    @Column(name = "card_label", length = 60)
    private String cardLabel;

    /**
     * 등록 가능한 매장 수 상한(애드온). null 이면 플랜 기본값을 따른다.
     *
     * <p><b>{@code PlanType} enum 을 건드리지 않고 상한을 조정하기 위한 필드다.</b> enum 은 선언 순서가
     * 곧 티어 서열이라 중간 삽입·재정렬이 금지돼 있어, 새 티어를 만드는 대신 구독 단위 애드온으로 푼다.</p>
     *
     * <p>기존 사용자 보호에도 쓰인다 — PRO 기본 상한을 도입할 때, 그보다 많은 매장을 이미 운영 중이던
     * 사장님은 이 값에 현재 보유 수를 넣어 소급 차단되지 않게 한다(grandfathering).</p>
     */
    @Column(name = "store_quota")
    private Integer storeQuota;

    /** 토스 customerKey — 사용자 식별용 영문 키. */
    @Column(name = "customer_key", length = 60, nullable = false)
    private String customerKey;

    /**
     * 가입 시점에 잠근 월정액(원, WP-8 grandfathering). null이면 현재 카탈로그 가격을 따른다
     * ({@link com.rich.sodam.service.PlanPricingService#effectivePriceKrw}가 이 폴백을 처리).
     * 이후 {@link PlanType}·{@link com.rich.sodam.config.PlanPricingProperties} 가격이 올라가도
     * 이 값이 채워진 구독은 청구 금액이 바뀌지 않는다 — 약관법상 불이익 변경(가격 인상) 사전고지
     * 없이 소급 적용하지 않기 위함.
     */
    @Column(name = "price_at_signup_krw")
    private Integer priceAtSignupKrw;

    /** A/B 가격 실험 그룹 배정(WP-8, 베타 실측용). null = 실험 미대상. 실제 가격 숫자는 안 바뀐다. */
    @Column(name = "price_variant", length = 20)
    private String priceVariant;

    private LocalDateTime startedAt;
    private LocalDateTime currentPeriodStartAt;
    private LocalDateTime currentPeriodEndAt;
    private LocalDateTime nextBillingAt;
    private LocalDateTime pausedAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime expiredAt;

    /** 90일 슬립: 비활성 무료 계정을 MAU 집계에서 정화하기 위한 휴면 표시. 재활동 시 해제. */
    private LocalDateTime dormantAt;

    /** 결제 실패 누적 횟수 — 3회 도달 시 EXPIRED. */
    @Column(nullable = false)
    private Integer paymentFailureCount = 0;

    /** 낙관적 락(웹 콘솔·모바일 동시 조작 충돌 감지용, 06_DB_마이그레이션계획.md §2.1). */
    @Version
    @Column(nullable = false)
    private Long version;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static Subscription pending(User user, PlanType plan, String customerKey) {
        return pending(user, plan, BillingCycle.MONTHLY, customerKey);
    }

    public static Subscription pending(User user, PlanType plan, BillingCycle cycle, String customerKey) {
        Subscription s = new Subscription();
        s.user = user;
        s.plan = plan;
        s.billingCycle = (cycle == null ? BillingCycle.MONTHLY : cycle);
        s.status = SubscriptionStatus.PENDING_PAYMENT;
        s.customerKey = customerKey;
        s.paymentFailureCount = 0;
        s.createdAt = LocalDateTime.now();
        return s;
    }

    /**
     * 가입 시점 가격을 잠근다(WP-8 grandfathering). {@code SubscriptionService.subscribe()}에서
     * 구독 생성 직후 1회만 호출 — 이후 재호출로 가입가를 바꾸지 않는다(가입 후 임의 변경 방지).
     */
    public void lockPrice(int monthlyPriceKrw) {
        if (this.priceAtSignupKrw != null) {
            return;
        }
        this.priceAtSignupKrw = monthlyPriceKrw;
        this.updatedAt = LocalDateTime.now();
    }

    /** A/B 가격 실험 그룹 배정(WP-8, 베타 실측용). */
    public void assignPriceVariant(String variant) {
        this.priceVariant = variant;
        this.updatedAt = LocalDateTime.now();
    }

    public void attachBillingKey(String billingKey, String cardLabel) {
        this.billingKey = billingKey;
        this.cardLabel = cardLabel;
        this.updatedAt = LocalDateTime.now();
    }

    public void activate(LocalDateTime periodStart, LocalDateTime periodEnd) {
        this.status = SubscriptionStatus.ACTIVE;
        if (this.startedAt == null) {
            this.startedAt = periodStart;
        }
        this.currentPeriodStartAt = periodStart;
        this.currentPeriodEndAt = periodEnd;
        this.nextBillingAt = periodEnd;
        this.paymentFailureCount = 0;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 무료 개월 부여 (S2 레퍼럴 보상) — 현재 기간 종료·다음 청구일을 months 만큼 뒤로 밀어
     * 그만큼 청구 없이 이용하게 한다. 활성 구독에만 의미 있음.
     */
    public void grantFreeMonths(int months) {
        if (months <= 0) {
            return;
        }
        LocalDateTime base = this.currentPeriodEndAt != null ? this.currentPeriodEndAt : LocalDateTime.now();
        this.currentPeriodEndAt = base.plusMonths(months);
        this.nextBillingAt = this.currentPeriodEndAt;
        this.updatedAt = LocalDateTime.now();
    }

    public void markPaymentFailed() {
        this.paymentFailureCount = (this.paymentFailureCount == null ? 0 : this.paymentFailureCount) + 1;
        if (this.paymentFailureCount >= 3) {
            this.status = SubscriptionStatus.EXPIRED;
            this.expiredAt = LocalDateTime.now();
        } else {
            this.status = SubscriptionStatus.PAST_DUE;
        }
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 결제 실패 후 PAST_DUE 일 때 다음 재시도 시각을 미룬다.
     * (과거: nextBillingAt 미연장으로 매 자정 배치가 무한 반복청구하던 죽은코드 → 수정)
     */
    public void scheduleRetry(int days) {
        this.nextBillingAt = LocalDateTime.now().plusDays(days);
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 비수기 일시정지. ACTIVE 에서만 가능. 청구는 보류되고 남은 기간은 resume 시 보존된다.
     */
    public void pause() {
        if (status != SubscriptionStatus.ACTIVE) {
            throw new IllegalStateException("활성 구독만 일시정지할 수 있습니다. 현재 상태: " + status);
        }
        // 해지 예약분을 일시정지하면 resume 시 기간이 뒤로 밀려 무상 연장이 된다.
        if (this.cancelledAt != null) {
            throw new IllegalStateException("해지 예약된 구독은 일시정지할 수 없습니다.");
        }
        this.status = SubscriptionStatus.PAUSED;
        this.pausedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 일시정지 해제. 정지 기간만큼 기간 종료일·다음 청구일을 미뤄 결제한 기간 손실이 없게 한다.
     */
    public void resume() {
        if (status != SubscriptionStatus.PAUSED) {
            throw new IllegalStateException("일시정지 상태만 재개할 수 있습니다. 현재 상태: " + status);
        }
        long pausedDays = pausedAt == null ? 0 : Duration.between(pausedAt, LocalDateTime.now()).toDays();
        if (this.currentPeriodEndAt != null) {
            this.currentPeriodEndAt = this.currentPeriodEndAt.plusDays(pausedDays);
        }
        if (this.nextBillingAt != null) {
            this.nextBillingAt = this.nextBillingAt.plusDays(pausedDays);
        }
        this.status = SubscriptionStatus.ACTIVE;
        this.pausedAt = null;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 해지 = "기간 말 해지 예약". 이미 결제한 기간의 이용권은 그대로 두고 자동갱신만 끊는다.
     *
     * <p>약관 제20조 3항·해지 시트 문구("결제는 이번 주기까지 유지돼요")·이 enum 문서가 모두
     * 같은 약속을 한다. 즉시 CANCELLED 로 바꾸면 {@code PlanAccessService}가 곧바로 무료 플랜으로
     * 취급해, 이미 받은 돈에 대한 이용권을 그 자리에서 빼앗게 된다(C-3/C-4 감사).</p>
     *
     * <p>기간이 끝나면 정기결제 배치가 {@link #expire()} 로 종결한다. {@code nextBillingAt} 을
     * 비워 다음 청구 대상에서 빠진다.</p>
     */
    public void cancel() {
        if (this.cancelledAt != null || this.status == SubscriptionStatus.CANCELLED
                || this.status == SubscriptionStatus.EXPIRED) {
            return;
        }
        this.cancelledAt = LocalDateTime.now();
        this.nextBillingAt = null;
        this.updatedAt = LocalDateTime.now();
    }

    /** 해지 예약 여부(기간은 아직 남아 있음). */
    public boolean isCancelScheduled() {
        return this.cancelledAt != null && this.status == SubscriptionStatus.ACTIVE;
    }

    public void expire() {
        this.status = SubscriptionStatus.EXPIRED;
        this.expiredAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE;
    }

    /** 90일 비활성 무료 계정을 휴면 처리(MAU 정화). 상태는 유지, 플래그만 설정. */
    public void markDormant() {
        this.dormantAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isDormant() {
        return dormantAt != null;
    }
}
