package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 채용 부스트 무제한 패스 — 사장(Master) 전용 애드온(recruitment-monetization-gamification-plan.md
 * §2.5). 기존 매장 정기구독({@link Subscription}/{@link com.rich.sodam.domain.type.SubscriptionStatus})과는
 * 완전히 별개 트랙이다 — 매장이 아니라 <b>사장(User) 단위</b>로 보유하고, 정기결제가 아니라 3/7/30일
 * 한정 기간제 상품을 구매한 만큼만 활성화된다.
 *
 * <p><b>스택형 연장 정책</b>: 계획서 §2.5에는 연장 구매 시 정책이 명시돼 있지 않아, 구매자에게
 * 손해가 없는 쪽(게임업계 정액권 표준 관행)으로 <b>스택형</b>을 채택했다 — 이미 활성 패스가 남아있는
 * 상태에서 추가 구매하면 기존 {@link #activeUntil}에 새 기간을 이어붙인다(덮어쓰지 않음). 이 정책은
 * 사용자 결정 없이 코드가 임의로 정한 것이므로, 사업 요구사항이 확정되면 재검토가 필요하다(인간 확인
 * 권장 — 계획서 §10 패턴과 동일하게 별도 보고 대상).</p>
 *
 * <p>동시 결제 승인(같은 사장이 동시에 여러 패스를 구매하는 등)에 대비해 {@link Version} 낙관적
 * 락을 건다({@link AttendanceCredit}과 동일 원칙).</p>
 */
@Entity
@Table(name = "recruitment_boost_pass", uniqueConstraints = {
        @UniqueConstraint(name = "uq_recruitment_boost_pass_owner", columnNames = "owner_user_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecruitmentBoostPass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    /** 이 시각까지 무제한 패스 혜택이 활성 — null 이면 구매 이력이 없거나(지갑 최초 생성) 항상 만료. */
    @Column(name = "active_until")
    private LocalDateTime activeUntil;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** 낙관적 락 — 동시 연장 요청 방지. */
    @Version
    @Column(nullable = false)
    private Long version;

    private RecruitmentBoostPass(Long ownerUserId) {
        this.ownerUserId = ownerUserId;
        this.createdAt = LocalDateTime.now();
    }

    public static RecruitmentBoostPass openFor(Long ownerUserId) {
        return new RecruitmentBoostPass(ownerUserId);
    }

    public boolean isActive(LocalDateTime now) {
        return activeUntil != null && activeUntil.isAfter(now);
    }

    /**
     * 패스 연장(스택형) — 이미 활성 상태면 남은 기간({@link #activeUntil}) 뒤에 이어붙이고, 만료됐거나
     * 최초 구매라면 지금(now) 시점부터 계산한다.
     */
    public void extend(LocalDateTime now, int durationDays) {
        LocalDateTime base = isActive(now) ? activeUntil : now;
        this.activeUntil = base.plusDays(durationDays);
        this.updatedAt = now;
    }

    /**
     * 결제 취소/환불 웹훅에 의한 최선노력 회수(claw-back) — {@link com.rich.sodam.service.AttendanceCreditService#reverseChargeBestEffort}와
     * 동일한 "최선노력" 원칙: 이미 지나간 기간(써버린 혜택)은 되돌릴 수 없으므로 단순히 남은
     * activeUntil에서 구매분 일수를 빼는 것으로 근사한다. 다른 구매로 이미 기간이 더 늘어난 뒤라면
     * 정확히 "이 주문분"만 골라 빼는 것이 불가능해 근사치가 된다 — 정확한 환불 정책(일할 계산 등)은
     * 인간 확인 필요로 별도 보고.
     *
     * <p><b>입력값은 이미 비례 계산된 값</b>: 호출자({@link com.rich.sodam.service.RecruitmentBoostPassService#cancelFromWebhook})가
     * 취소 비율(cancelAmount / 원래 결제금액)만큼 미리 곱한 일수를 전달한다 — 부분환불이면 원래 구매
     * 일수 전체가 아니라 그 비율만큼만 여기 들어온다.</p>
     *
     * @return 실제로 차감된 일수(현재 구현은 clamp 없이 항상 요청값 그대로 차감한다 — 반환값은 호출자의
     * 감사 로그 기록용으로, 향후 하한 clamp가 추가되어도 이 메서드의 계약이 유지되게 하기 위함).
     */
    public int reverseBestEffort(int durationDays) {
        if (activeUntil == null || durationDays <= 0) {
            return 0;
        }
        this.activeUntil = activeUntil.minusDays(durationDays);
        this.updatedAt = LocalDateTime.now();
        return durationDays;
    }
}
