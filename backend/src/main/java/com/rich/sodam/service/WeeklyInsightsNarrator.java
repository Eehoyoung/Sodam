package com.rich.sodam.service;

import com.rich.sodam.dto.response.WeeklyInsightsResponse;
import com.rich.sodam.dto.response.WeeklyInsightsResponse.InsightItem;
import com.rich.sodam.service.ai.ForbiddenPhrases;
import com.rich.sodam.service.ai.LlmText;
import com.rich.sodam.service.ai.TextGenerationClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 사장 주간 브리핑(WP-2, {@code docs/260817} goal) — 퍼널 이벤트 집계를 한두 문장 요약으로 변환.
 *
 * <p>WP-0의 {@link AnthropicTextClient}·{@link ForbiddenPhrases}를 재사용한다(HC-6). 집계 카운트는
 * 개인 식별 정보가 아니므로(HC-8) {@link com.rich.sodam.service.LlmLaborRiskNarrator}와 달리
 * 비식별화 단계가 없다 — 가장 단순한 확장(계획서 WP-2 참고).</p>
 *
 * <p>실패 안전: provider 미설정·네트워크 실패·검증 실패는 전부 {@code null}로 흡수한다. 호출부(FE)는
 * {@code null}이면 기존 숫자 나열형 표시로 폴백한다(HC-7).</p>
 */
@Service
public class WeeklyInsightsNarrator {

    private final Optional<TextGenerationClient> client;

    public WeeklyInsightsNarrator(Optional<TextGenerationClient> client) {
        this.client = client;
    }

    public String summarize(WeeklyInsightsResponse response) {
        if (response.items() == null || response.items().isEmpty()) {
            return null;
        }
        return LlmText.tryGenerate(client, () -> buildPrompt(response),
                summary -> passesValidation(summary, response.items()),
                null, "WeeklyInsightsNarrator");
    }

    static String buildPrompt(WeeklyInsightsResponse response) {
        StringBuilder counts = new StringBuilder();
        for (InsightItem item : response.items()) {
            counts.append(item.label()).append("=").append(item.count()).append("건, ");
        }
        return "다음은 소상공인 사장님용 앱의 최근 " + response.days() + "일 매장 활동 집계다. "
                + "숫자를 하나도 바꾸지 말고 자연스러운 한두 문장 요약으로 만들어라. "
                + "추세를 단정하는 표현(예: '반드시 늘 것')이나 법적 확언(위반이다/막아준다/안전합니다/정확하다 등)을 "
                + "쓰지 마라.\n\n집계: " + counts;
    }

    /** HC-1 금지어 + 0보다 큰 카운트값이 요약 문장에 그대로 남아있는지 검증. */
    static boolean passesValidation(String summary, List<InsightItem> items) {
        if (summary == null || summary.isBlank()) {
            return false;
        }
        if (ForbiddenPhrases.containsAny(summary)) {
            return false;
        }
        for (InsightItem item : items) {
            if (item.count() > 0 && !summary.contains(String.valueOf(item.count()))) {
                return false; // 수치가 사라지거나 바뀜 — 요약 변형 의심
            }
        }
        return true;
    }
}
