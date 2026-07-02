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
        PlanType plan = currentPlan();
        if (!plan.hasFeature(PlanFeature.MULTI_STORE)) {
            throw new PlanRequiredException(PlanType.PRO, plan,
                    "매장은 1개까지 무료예요. 매장을 더 추가하려면 멀티매장 플랜(프로 이상)으로 올려주세요.");
        }
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
