package com.rich.sodam.service;

import com.rich.sodam.domain.Referral;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.ReferralRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

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
    private final UserRepository userRepository;

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

    // ─────────────────────────────────────────────────────────────────
    // WP-09: ReferralController 의 repository 직접 조회/저장 로직 이관
    // ─────────────────────────────────────────────────────────────────

    /** 내 추천 코드 조회/발급 — 사용자당 1개 고정 코드. 영문+숫자 8자리. */
    public Map<String, Object> myCode(Long userId) {
        String code = generateCodeFromUserId(userId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("referralCode", code);
        body.put("shareText", String.format(
                "소담에서 출퇴근·급여를 한 번에! 가입 시 코드 %s 입력하면 양쪽 모두 1개월 무료 받아요. https://sodam.app", code));
        return body;
    }

    /**
     * 추천 코드 적용(피추천자). 회원가입 직후 또는 첫 결제 전 1회. 본인 코드 적용 불가.
     * 실패 사유는 {@link ApplyResult#message()} 로 전달 — 컨트롤러가 200/400 매핑을 그대로 유지한다.
     */
    @Transactional
    public ApplyResult applyReferralCode(Long refereeUserId, String code) {
        Long referrerUserId = parseCodeToUserId(code);
        if (referrerUserId == null) {
            return ApplyResult.failure("올바르지 않은 추천 코드예요.");
        }
        if (referrerUserId.equals(refereeUserId)) {
            return ApplyResult.failure("본인 코드는 적용할 수 없어요.");
        }
        if (referralRepository.existsByReferralCodeAndReferee_Id(code, refereeUserId)) {
            return ApplyResult.failure("이미 적용된 추천 코드예요.");
        }
        if (referralRepository.findByReferee_Id(refereeUserId).isPresent()) {
            return ApplyResult.failure("추천 코드는 가입당 1번만 적용할 수 있어요.");
        }

        User referrer = userRepository.findById(referrerUserId).orElse(null);
        User referee = userRepository.findById(refereeUserId).orElse(null);
        if (referrer == null || referee == null) {
            return ApplyResult.failure("사용자 정보를 찾을 수 없어요.");
        }
        referralRepository.save(Referral.register(code, referrer, referee));
        return ApplyResult.success("추천 코드가 적용됐어요. 첫 결제 후 보상이 지급돼요.");
    }

    /** 내가 추천한 친구 이력. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> myHistory(Long referrerUserId) {
        return referralRepository.findByReferrer_IdOrderByRegisteredAtDesc(referrerUserId)
                .stream().map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("refereeId", r.getReferee() != null ? r.getReferee().getId() : null);
                    m.put("refereeName", r.getReferee() != null ? r.getReferee().getName() : null);
                    m.put("status", r.getStatus().name());
                    m.put("registeredAt", r.getRegisteredAt());
                    m.put("convertedAt", r.getConvertedAt());
                    return m;
                }).toList();
    }

    /** 사용자 ID 기반 결정적 8자리 코드. 외부 공유 안전. */
    private static String generateCodeFromUserId(Long userId) {
        String seed = "SODAM-REF-V1-" + userId;
        String hash = UUID.nameUUIDFromBytes(seed.getBytes()).toString()
                .replace("-", "").toUpperCase();
        return "S" + hash.substring(0, 7); // 8자리
    }

    /** 코드 → userId 역추적. 결정적이므로 가능. 무차별 추측 방지를 위해 hash 일치 검증. */
    private static Long parseCodeToUserId(String code) {
        if (code == null || code.length() != 8 || !code.startsWith("S")) return null;
        // 1~1,000,000 까지 brute-force — 출시 초기에만 안전. 운영 시 별도 매핑 테이블 필요.
        // TODO[Phase 2]: 코드 매핑 테이블(ReferralCode) 신규 도입 — UUID 무작위 코드 + DB 조회로 보안 강화.
        for (long uid = 1; uid <= 1_000_000; uid++) {
            if (generateCodeFromUserId(uid).equals(code)) return uid;
        }
        return null;
    }

    /** 추천 코드 적용 결과. {@code success=false} 면 {@code message} 가 실패 사유. */
    public record ApplyResult(boolean success, String message) {
        static ApplyResult failure(String message) {
            return new ApplyResult(false, message);
        }

        static ApplyResult success(String message) {
            return new ApplyResult(true, message);
        }
    }
}
