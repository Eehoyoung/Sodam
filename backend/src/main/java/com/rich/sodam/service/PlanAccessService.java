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

    /** 직원 수 상한 검사(상한 초과 시 PlanRequiredException). */
    public void assertEmployeeCapacity(int currentEmployeeCount) {
        PlanType plan = currentPlan();
        if (!plan.allowsEmployeeCount(currentEmployeeCount)) {
            throw new PlanRequiredException(PlanType.PRO, plan,
                    plan.getDisplayName() + " 플랜은 직원 " + plan.getEmployeeLimit()
                            + "명까지 등록할 수 있어요. 상위 플랜으로 올려주세요.");
        }
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
