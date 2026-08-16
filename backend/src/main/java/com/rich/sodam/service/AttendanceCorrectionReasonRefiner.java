package com.rich.sodam.service;

import com.rich.sodam.service.ai.AnthropicTextClient;
import com.rich.sodam.service.ai.ForbiddenPhrases;
import com.rich.sodam.service.ai.PiiPatterns;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 출퇴근 정정 요청 사유 다듬기(WP-1, {@code docs/260817} goal).
 *
 * <p>WP-0에서 추출한 {@link AnthropicTextClient}·{@link ForbiddenPhrases}를 재사용한다(HC-6).
 * {@code sodam.ai.provider=anthropic}가 아니면 {@link AnthropicTextClient} 빈이 아예 생성되지
 * 않으므로 이 클래스는 항상 원본 사유를 그대로 반환한다(HC-7, 외부 호출 0).</p>
 *
 * <p>사유 텍스트는 "사장님과 직원 본인만 볼 수 있어요"로 이미 스코프가 좁혀져 있어 PII 위험이
 * 낮지만, 전화번호처럼 보이는 숫자열이 응답에 새로 생기면 방어적으로 폴백한다(HC-8).</p>
 */
@Slf4j
@Service
public class AttendanceCorrectionReasonRefiner {

    private static final int MAX_LENGTH = 200;

    private final Optional<AnthropicTextClient> client;

    public AttendanceCorrectionReasonRefiner(Optional<AnthropicTextClient> client) {
        this.client = client;
    }

    /** 실패 안전: 어떤 이유로든 다듬기를 신뢰할 수 없으면 원본 사유를 그대로 반환한다. */
    public String refine(String reason) {
        if (client.isEmpty() || !client.get().isReady() || reason == null || reason.isBlank()) {
            return reason;
        }
        try {
            String response = client.get().complete(buildPrompt(reason));
            if (response == null) {
                return reason;
            }
            String rephrased = response.trim();
            return passesValidation(rephrased, reason) ? rephrased : reason;
        } catch (Exception e) {
            log.debug("[AttendanceCorrectionReasonRefiner] 다듬기 실패 — 원본 유지. cause={}", e.toString());
            return reason;
        }
    }

    static String buildPrompt(String reason) {
        return "다음은 직원이 사장님에게 보내는 출퇴근 정정 요청 사유다. 말투만 자연스럽게 다듬어라. "
                + "정정을 요청하는 이유·사실관계를 새로 지어내거나 바꾸지 마라. "
                + "법적 확언(위반이다/막아준다/안전합니다/정확하다 등)을 추가하지 마라.\n\n"
                + "원문: " + reason;
    }

    /** HC-1 금지어 + 길이 제약(5~200자, 도메인 필드 제약과 동일) + 전화번호 패턴 신규 유입 방어. */
    static boolean passesValidation(String rephrased, String original) {
        if (rephrased == null || rephrased.isBlank()) {
            return false;
        }
        if (rephrased.length() < 5 || rephrased.length() > MAX_LENGTH) {
            return false;
        }
        if (ForbiddenPhrases.containsAny(rephrased)) {
            return false;
        }
        boolean phoneAppeared = PiiPatterns.containsPhoneLike(rephrased) && !PiiPatterns.containsPhoneLike(original);
        return !phoneAppeared;
    }
}
