package com.rich.sodam.service;

import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * 기본 내레이터 — 규칙 엔진({@link LaborRiskService})이 RiskType별로 이미 생성한 문구를
 * 그대로 반환한다(외부 호출 0, 비용 0). {@code sodam.ai.provider} 미설정이 기본값이며,
 * 이 상태에서 노무 리스크 대시보드는 100% 동작한다.
 *
 * <p>{@code sodam.ai.provider=anthropic} 설정 시 {@link LlmLaborRiskNarrator}가
 * {@code laborRiskNarratorProvider} 빈 이름으로 이 빈을 대체한다({@link ConditionalOnMissingBean}).
 */
@Component
@ConditionalOnMissingBean(name = "laborRiskNarratorProvider")
public class TemplateLaborRiskNarrator implements LaborRiskNarrator {

    @Override
    public String narrate(Item item) {
        return item.message();
    }
}
