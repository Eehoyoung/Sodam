package com.rich.sodam.service;

import com.rich.sodam.domain.Referral;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.ReferralRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.ReferralRewardService.ReferralRewardResult;
import com.rich.sodam.service.ReferralRewardService.ReferralRewardSummary;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 레퍼럴 보상 루프 (S2) — 전환·보상 산정·멱등. 빌링 적용은 하지 않음(키-레디).
 */
class ReferralRewardServiceTest {

    private final ReferralRepository referralRepository = mock(ReferralRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ReferralRewardService service = new ReferralRewardService(referralRepository, userRepository);

    @Test
    @DisplayName("피추천인 첫 결제 → 전환(CONVERTED) + 양측 1개월 보상 산정")
    void convertsAndComputesReward() {
        User referrer = mock(User.class);
        when(referrer.getId()).thenReturn(100L);
        User referee = mock(User.class);
        Referral referral = Referral.register("CODE1234", referrer, referee); // REGISTERED
        when(referralRepository.findByReferee_Id(20L)).thenReturn(Optional.of(referral));

        Optional<ReferralRewardResult> result = service.processRefereeFirstPayment(20L);

        assertThat(result).isPresent();
        assertThat(result.get().referrerUserId()).isEqualTo(100L);
        assertThat(result.get().freeMonths()).isEqualTo(1);
        assertThat(referral.getStatus()).isEqualTo(Referral.Status.CONVERTED); // convert() 적용됨

        // 멱등: 이미 전환된 레퍼럴 재처리 → 빈 결과
        assertThat(service.processRefereeFirstPayment(20L)).isEmpty();
    }

    @Test
    @DisplayName("레퍼럴 없으면 빈 결과")
    void noReferral() {
        when(referralRepository.findByReferee_Id(30L)).thenReturn(Optional.empty());
        assertThat(service.processRefereeFirstPayment(30L)).isEmpty();
    }

    @Test
    @DisplayName("보상 요약: 전환 건수 × 1개월")
    void rewardSummary() {
        when(referralRepository.countByReferrer_IdAndStatus(eq(100L), eq(Referral.Status.CONVERTED)))
                .thenReturn(3L);
        ReferralRewardSummary summary = service.myRewards(100L);
        assertThat(summary.convertedCount()).isEqualTo(3);
        assertThat(summary.freeMonthsEarned()).isEqualTo(3);
    }
}
