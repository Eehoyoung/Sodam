package com.rich.sodam.service;

import com.rich.sodam.domain.Referral;
import com.rich.sodam.domain.ReferralCodeMap;
import com.rich.sodam.repository.ReferralCodeMapRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 레퍼럴 보상 루프 (S2) — 전환·보상 산정·멱등. 빌링 적용은 하지 않음(키-레디).
 */
class ReferralRewardServiceTest {

    private final ReferralRepository referralRepository = mock(ReferralRepository.class);
    private final ReferralCodeMapRepository referralCodeMapRepository = mock(ReferralCodeMapRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ReferralRewardService service = new ReferralRewardService(
            referralRepository, referralCodeMapRepository, userRepository);

    @Test
    @DisplayName("피추천인 첫 결제 → 전환(CONVERTED) + 양측 1개월 보상 산정")
    void convertsAndComputesReward() {
        User referrer = mock(User.class);
        when(referrer.getId()).thenReturn(100L);
        User referee = mock(User.class);
        Referral referral = Referral.register("CODE1234", referrer, referee); // REGISTERED
        when(referralRepository.findByRefereeIdForUpdate(20L)).thenReturn(Optional.of(referral));

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
        when(referralRepository.findByRefereeIdForUpdate(30L)).thenReturn(Optional.empty());
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

    @Test
    @DisplayName("존재하지 않는 추천 코드는 매핑 인덱스 한 번 조회하고 사용자 조회 없이 거절한다")
    void rejectsUnknownCodeWithoutUserIdBruteForce() {
        when(referralCodeMapRepository.findByCode("UNKNOWN1")).thenReturn(Optional.empty());

        ReferralRewardService.ApplyResult result = service.applyReferralCode(200L, " unknown1 ");

        assertThat(result.success()).isFalse();
        verify(referralCodeMapRepository).findByCode("UNKNOWN1");
        verify(userRepository, never()).findById(org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    @DisplayName("이미 발급된 내 추천 코드는 새 매핑을 만들지 않고 재사용한다")
    void reusesExistingReferralCode() {
        ReferralCodeMap existing = mock(ReferralCodeMap.class);
        when(existing.getCode()).thenReturn("AB12CD34");
        when(referralCodeMapRepository.findByUserId(100L)).thenReturn(Optional.of(existing));

        assertThat(service.myCode(100L).get("referralCode")).isEqualTo("AB12CD34");

        verify(referralCodeMapRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("최초 발급 경쟁에서 잠금 대기 중 생성된 코드를 다시 읽어 500 없이 반환한다")
    void returnsCodeCreatedWhileWaitingForUserLock() {
        User user = mock(User.class);
        ReferralCodeMap concurrentlyCreated = mock(ReferralCodeMap.class);
        when(concurrentlyCreated.getCode()).thenReturn("ZX98YU76");
        when(referralCodeMapRepository.findByUserId(300L))
                .thenReturn(Optional.empty(), Optional.of(concurrentlyCreated));
        when(userRepository.findByIdForUpdate(300L)).thenReturn(Optional.of(user));

        assertThat(service.myCode(300L).get("referralCode")).isEqualTo("ZX98YU76");

        verify(userRepository).findByIdForUpdate(300L);
        verify(referralCodeMapRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }
}
