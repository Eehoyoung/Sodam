package com.rich.sodam.service;

import com.rich.sodam.service.ai.ForbiddenPhrases;
import com.rich.sodam.service.ai.LlmText;
import com.rich.sodam.service.ai.PiiPatterns;
import com.rich.sodam.service.ai.TextGenerationClient;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 채용 지원 메시지 다듬기(WP-3, {@code docs/260817} goal).
 *
 * <p>WP-0의 {@link AnthropicTextClient}·{@link ForbiddenPhrases}를 재사용한다(HC-6). 지원 메시지는
 * 구직자가 자유롭게 쓰는 문구라 연락처가 섞여 들어갈 위험이 WP-1보다 높다(HC-8) — LLM에 보내기
 * 전에 전화번호로 보이는 부분을 마스킹한다. 다듬기는 "말투 정리"이지 새 내용 생성이 아니므로,
 * 원문에 없던 경력·이력을 지어내면 안 된다는 제약을 프롬프트에 명시한다.</p>
 *
 * <p>실패 안전: provider 미설정(기본값)·네트워크 실패·검증 실패는 전부 원본 메시지로 흡수한다.</p>
 */
@Service
public class JobApplicationMessageRefiner {

    static final String PHONE_MASK = "[연락처]";
    private static final int MAX_LENGTH = 200;

    private final Optional<TextGenerationClient> client;

    public JobApplicationMessageRefiner(Optional<TextGenerationClient> client) {
        this.client = client;
    }

    public String refine(String message) {
        if (message == null || message.isBlank()) {
            return message;
        }
        // 마스킹은 프롬프트 안에서 한다 — 클라이언트가 없으면 아예 평가되지 않는다.
        return LlmText.tryGenerate(client,
                () -> buildPrompt(PiiPatterns.maskPhoneLike(message, PHONE_MASK)),
                rephrased -> passesValidation(rephrased, message),
                message, "JobApplicationMessageRefiner");
    }

    static String buildPrompt(String maskedMessage) {
        return "다음은 구직자가 사장님에게 보내는 채용 지원 메시지다. 말투만 자연스럽고 정중하게 다듬어라. "
                + "원문에 없는 경력·이력·연락처를 새로 지어내거나 추가하지 마라. "
                + "\"" + PHONE_MASK + "\" 같은 마스킹 표기는 그대로 유지하고 실제 번호로 채우지 마라. "
                + "법적 확언(위반이다/막아준다/안전합니다/정확하다 등)을 추가하지 마라.\n\n"
                + "원문: " + maskedMessage;
    }

    /** HC-1 금지어 + 길이 제약(도메인 필드 200자) + 원문에 없던 전화번호 패턴 신규 유입 방어(HC-8). */
    static boolean passesValidation(String rephrased, String original) {
        if (rephrased == null || rephrased.isBlank()) {
            return false;
        }
        if (rephrased.length() > MAX_LENGTH) {
            return false;
        }
        if (ForbiddenPhrases.containsAny(rephrased)) {
            return false;
        }
        boolean phoneAppeared = PiiPatterns.containsPhoneLike(rephrased) && !PiiPatterns.containsPhoneLike(original);
        return !phoneAppeared;
    }
}
