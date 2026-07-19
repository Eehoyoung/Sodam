package com.rich.sodam.service;

import com.rich.sodam.config.SentryReporter;
import com.rich.sodam.repository.StoreNfcTagRepository;
import com.rich.sodam.service.model.NfcVerifyResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * NFC 태그 검증 서비스.
 *
 * <p>대리출근 방지를 위해 (a) 기본 형식 검사 + (b) 매장-태그 DB 대조를 수행한다.
 * 과거 스텁은 "SODAM-" 접두/길이만 봤기에 임의 문자열로 통과됐다.
 * 이제는 제시된 (storeId, tagId) 가 store_nfc_tag 에 <b>active</b> 로 등록돼 있어야만 통과한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NfcVerificationService {

    /** 동일 매장에서 연속 INVALID_TAG 가 이 횟수에 도달하면 대리출근 시도 의심 → Sentry 알람. */
    private static final int NFC_FAILURE_ALERT_THRESHOLD = 5;

    private final StoreNfcTagRepository storeNfcTagRepository;
    private final SentryReporter sentryReporter;

    /** 매장별 연속 NFC 실패 카운터(성공 시 리셋). 단일 인스턴스 기준 근사치 — 알람 트리거 용도. */
    private final Map<Long, AtomicInteger> consecutiveFailuresByStore = new ConcurrentHashMap<>();

    /**
     * 태그 유효성 검증.
     * <ol>
     *   <li>형식: "SODAM-" 접두, 최소 10자 (1차 방어 — 명백한 오타/임의값 조기 거부)</li>
     *   <li>매장-태그 대조: (storeId, tagId) 가 active 로 등록돼 있는지 DB 조회 (현장 인증의 핵심)</li>
     * </ol>
     *
     * <p>storeId 가 null 이면 어느 매장과 대조할지 알 수 없어 현장 인증이 불가능하므로 거부한다.
     * (하위호환으로 형식만 통과시키면 대리출근 구멍이 그대로 남으므로 의도적으로 막는다.)
     *
     * @param storeId 매장 ID (필수 — 매장 대조 대상)
     * @param tagId   태그 식별자
     * @return { success, reason }. 실패 사유는 INVALID_TAG.
     */
    @Transactional(readOnly = true)
    public NfcVerifyResult verifyTag(Long storeId, String tagId) {
        if (tagId == null || tagId.isBlank()) {
            return fail("빈 tagId");
        }
        if (!tagId.startsWith("SODAM-") || tagId.length() < 10) {
            return fail("형식 불량 tagId");
        }
        // storeId 없이는 어느 매장 태그인지 대조할 수 없음 → 현장 인증 불가 → 거부.
        if (storeId == null) {
            return fail("storeId 누락 — 매장 대조 불가");
        }
        if (!storeNfcTagRepository.existsByStore_IdAndTagIdAndActiveTrue(storeId, tagId)) {
            recordFailure(storeId); // 형식은 맞으나 미등록 → 대리출근 의심 신호로 누적
            return fail("미등록/비활성 태그 (store=" + storeId + ")");
        }
        consecutiveFailuresByStore.remove(storeId); // 성공 시 카운터 리셋
        return new NfcVerifyResult(true, null);
    }

    /**
     * 매장별 연속 실패 누적. 임계 도달 시 Sentry 알람(비활성이면 no-op) 후 카운터 리셋.
     * 태그값(PII 가능성)은 캡처하지 않고 매장ID·횟수만 태깅한다.
     */
    private void recordFailure(Long storeId) {
        int count = consecutiveFailuresByStore
                .computeIfAbsent(storeId, k -> new AtomicInteger())
                .incrementAndGet();
        if (count >= NFC_FAILURE_ALERT_THRESHOLD) {
            sentryReporter.captureMessage(
                    SentryReporter.ALERT_NFC_REPEATED_FAILURE,
                    "NFC INVALID_TAG 반복(대리출근 의심) store=" + storeId + " count=" + count,
                    Map.of("storeId", String.valueOf(storeId)));
            consecutiveFailuresByStore.remove(storeId);
        }
    }

    private NfcVerifyResult fail(String reason) {
        log.debug("NFC 검증 실패: {}", reason);
        return new NfcVerifyResult(false, "INVALID_TAG");
    }
}
