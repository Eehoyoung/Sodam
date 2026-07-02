package com.rich.sodam.service;

import com.rich.sodam.domain.Referral;
import com.rich.sodam.repository.ReferralRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 레퍼럴 보상 루프 (S2/GR-NEW-01) — <b>키-레디</b>.
 *
 * <p>현재 {@code Referral.convert()} 가 어디서도 호출되지 않아 보상 루프가 죽어 있다.
 * 이 서비스는 "피추천인 첫 결제" 시 전환 처리 + 보상(양측 1개월) 산정을 제공한다.
 *
 * <p><b>✅ 활성화됨(2026-06-18 대표 승인)</b>: {@code SubscriptionService#subscribe} 첫 결제 성공 시
 * {@link #processRefereeFirstPayment} 호출 → 전환, 양측 구독을
 * {@code Subscription#grantFreeMonths(REWARD_MONTHS)} 로 무료 개월 부여(다음 청구 연기).
 */
@Service
@RequiredArgsConstructor
public class ReferralRewardService {

    /** 전환 성공 시 양측에게 줄 무료 개월 수(수익화 v3.1). */
    public static final int REWARD_MONTHS = 1;

    private final ReferralRepository referralRepository;

    /**
     * 피추천인 첫 결제 처리 — REGISTERED 레퍼럴을 CONVERTED 로 전이하고 보상 산정.
     * 빌링 적용은 하지 않는다(승인 후 호출부에서). 멱등: 이미 전환됐거나 레퍼럴 없으면 빈 결과.
     */
    @Transactional
    public Optional<ReferralRewardResult> processRefereeFirstPayment(Long refereeUserId) {
        Optional<Referral> opt = referralRepository.findByReferee_Id(refereeUserId);
        if (opt.isEmpty()) {
            return Optional.empty();
        }
        Referral referral = opt.get();
        if (referral.getStatus() != Referral.Status.REGISTERED) {
            return Optional.empty();
        }
        referral.convert();
        Long referrerId = referral.getReferrer() != null ? referral.getReferrer().getId() : null;
        return Optional.of(new ReferralRewardResult(referrerId, refereeUserId, REWARD_MONTHS));
    }

    /** 추천인의 전환 완료 건수·적립 무료 개월(읽기 — FE 표시용, 빌링 무관). */
    @Transactional(readOnly = true)
    public ReferralRewardSummary myRewards(Long referrerUserId) {
        long converted = referralRepository.countByReferrer_IdAndStatus(
                referrerUserId, Referral.Status.CONVERTED);
        return new ReferralRewardSummary(converted, converted * REWARD_MONTHS);
    }

    /** 전환 처리 결과(보상 산정). 빌링 적용 전 단계. */
    public record ReferralRewardResult(Long referrerUserId, Long refereeUserId, int freeMonths) {
    }

    /** 추천인 보상 요약. */
    public record ReferralRewardSummary(long convertedCount, long freeMonthsEarned) {
    }
}
