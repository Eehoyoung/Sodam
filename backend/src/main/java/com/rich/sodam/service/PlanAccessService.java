package com.rich.sodam.service;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.SubscriptionStatus;
import com.rich.sodam.exception.PlanRequiredException;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 플랜 기반 접근 제어. 현재 사용자의 활성 구독 플랜을 해석하고 기능·티어·직원수 게이트를 평가한다.
 *
 * 활성 구독이 없으면 {@link PlanType#FREE} 로 간주한다(가입만 하고 결제 전인 사장님).
 */
@Service
@RequiredArgsConstructor
public class PlanAccessService {

    /**
     * PRO 기본 매장 상한 — 첫 매장(무료 1곳) + 요금제 화면이 고지한 "멀티매장 1개 포함" = 2곳.
     *
     * <p>⚠️ 이 값은 <b>사용자에게 이미 고지된 문구</b>에서 나온 것이다. 바꾸려면 요금제 화면
     * (SubscribeScreen)·플랜 카탈로그({@code PlanType}) 문구를 함께 고쳐야 하고, 기존 가입자에게는
     * 약관 개정 절차(30일 사전고지)가 필요하다.</p>
     */
    static final int PRO_DEFAULT_STORE_QUOTA = 2;

    private final SubscriptionRepository subscriptionRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final com.rich.sodam.config.AbTestProperties abTestProperties;

    /** 현재 인증 사용자의 유효 플랜(활성 구독 없으면 FREE). */
    @Transactional(readOnly = true)
    public PlanType currentPlan() {
        return planOf(currentUserId());
    }

    /**
     * 매장 소유주(사장)의 플랜이 해당 기능을 보유하는지. 직원이 명세서를 조회해도
     * 게이팅은 "그 매장 사장의 플랜" 기준이어야 하므로(직원은 구독 주체가 아님) 사용.
     * 소유주를 못 찾으면 false(미보유로 간주).
     */
    @Transactional(readOnly = true)
    public boolean storeOwnerHasFeature(Long storeId, PlanFeature feature) {
        return masterStoreRelationRepository.findByStore_Id(storeId).stream()
                .findFirst()
                .map(rel -> planOf(rel.getMasterProfile().getId()).hasFeature(feature))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public PlanType planOf(Long userId) {
        Subscription s = subscriptionRepository
                .findFirstByUser_IdAndStatusIn(userId, List.of(SubscriptionStatus.ACTIVE))
                .orElse(null);
        return s != null ? s.getPlan() : PlanType.FREE;
    }

    /** {@code @RequirePlan} 검사 진입점. 불충족 시 {@link PlanRequiredException}. */
    public void assertAccess(PlanType min, PlanFeature[] features) {
        PlanType plan = currentPlan();
        if (!plan.isAtLeast(min)) {
            throw new PlanRequiredException(min, plan,
                    min.getDisplayName() + " 플랜 이상에서 이용할 수 있어요.");
        }
        for (PlanFeature f : features) {
            if (!plan.hasFeature(f)) {
                throw new PlanRequiredException(min, plan,
                        "'" + f.getLabel() + "' 기능은 상위 플랜에서 이용할 수 있어요.");
            }
        }
    }

    /**
     * 멀티매장 게이트. 사장이 이미 매장을 1개 이상 보유한 상태에서 추가 매장을 등록하려면
     * MULTI_STORE 기능(PRO/PREMIUM)이 필요하다. 첫 매장 등록은 항상 허용.
     *
     * @param existingStoreCount 현재 보유 중인 매장 수
     */
    public void assertCanRegisterAdditionalStore(int existingStoreCount) {
        if (existingStoreCount < 1) {
            return; // 첫 매장은 무료 허용
        }
        Subscription subscription = activeSubscription(currentUserId());
        PlanType plan = subscription != null ? subscription.getPlan() : PlanType.FREE;
        if (!plan.hasFeature(PlanFeature.MULTI_STORE)) {
            throw new PlanRequiredException(PlanType.PRO, plan,
                    "매장은 1개까지 무료예요. 매장을 더 추가하려면 멀티매장 플랜(프로 이상)으로 올려주세요.");
        }

        Integer quota = effectiveStoreQuota(plan, subscription);
        if (quota != null && existingStoreCount >= quota) {
            throw new PlanRequiredException(PlanType.PREMIUM, plan,
                    plan.getDisplayName() + " 플랜은 매장 " + quota + "곳까지 등록할 수 있어요. "
                            + "매장을 더 운영하시려면 프리미엄으로 올려주세요.");
        }
    }

    /**
     * 유효 매장 수 상한 — null 이면 무제한.
     *
     * <p>PREMIUM 은 요금제 화면·플랜 카탈로그 양쪽에 <b>"멀티매장 무제한"</b>으로 고지돼 있어
     * 쿼터를 적용하지 않는다. 여기에 상한을 씌우면 약관법상 불이익 변경이 된다(2026-08-08 조사).</p>
     *
     * <p>PRO 는 반대다 — 화면에 "멀티매장 1개 포함"으로 고지해 왔는데 실제로는 제한이 없어
     * 고지보다 과다 제공 중이었다. 따라서 상한 도입은 불이익 변경이 아니라 고지대로 맞추는 시정이다.
     * 그럼에도 이미 더 많은 매장을 운영 중이던 사장님은 {@code storeQuota} 로 보호한다(grandfathering).</p>
     */
    private Integer effectiveStoreQuota(PlanType plan, Subscription subscription) {
        if (plan == PlanType.PREMIUM) {
            return null;
        }
        if (subscription != null && subscription.getStoreQuota() != null) {
            return subscription.getStoreQuota();
        }
        return plan == PlanType.PRO ? PRO_DEFAULT_STORE_QUOTA : null;
    }

    private Subscription activeSubscription(Long userId) {
        return subscriptionRepository
                .findFirstByUser_IdAndStatusIn(userId, List.of(SubscriptionStatus.ACTIVE))
                .orElse(null);
    }

    /** 직원 수 상한 검사(상한 초과 시 PlanRequiredException). */
    public void assertEmployeeCapacity(int currentEmployeeCount) {
        PlanType plan = currentPlan();
        Integer effectiveLimit = effectiveEmployeeLimit(plan);
        boolean allowed = effectiveLimit == null || currentEmployeeCount <= effectiveLimit;
        if (!allowed) {
            throw new PlanRequiredException(PlanType.PRO, plan,
                    plan.getDisplayName() + " 플랜은 직원 " + effectiveLimit
                            + "명까지 등록할 수 있어요. 상위 플랜으로 올려주세요.");
        }
    }

    /**
     * 플랜의 유효 직원 상한. 기본은 {@link PlanType#getEmployeeLimit()}.
     * FREE 한정 A/B override({@code sodam.ab.free-employee-limit})가 <b>설정된 경우에만</b> 덮어쓴다.
     * 미설정이면 현행 default 그대로(과금·패키징 불변).
     */
    private Integer effectiveEmployeeLimit(PlanType plan) {
        if (plan == PlanType.FREE && abTestProperties.hasFreeEmployeeLimitOverride()) {
            return abTestProperties.getFreeEmployeeLimit();
        }
        return plan.getEmployeeLimit();
    }

    public boolean hasFeature(PlanFeature feature) {
        return currentPlan().hasFeature(feature);
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
            return up.getId();
        }
        throw new IllegalStateException("인증 정보가 없습니다.");
    }
}
