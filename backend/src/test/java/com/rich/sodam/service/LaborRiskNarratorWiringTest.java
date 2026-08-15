package com.rich.sodam.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-4 배선 증명 — {@code sodam.ai.provider} 미설정(테스트 프로필 기본값)에서
 * {@link TemplateLaborRiskNarrator}만 빈으로 뜨고 {@link LlmLaborRiskNarrator}는
 * 아예 생성되지 않는다(외부 호출 0으로 전 기능 동작).
 */
@SpringBootTest
@ActiveProfiles("test")
class LaborRiskNarratorWiringTest {

    @Autowired private ApplicationContext context;
    @Autowired private LaborRiskNarrator laborRiskNarrator;

    @Test
    @DisplayName("provider 미설정 — 기본 빈은 TemplateLaborRiskNarrator다")
    void defaultBeanIsTemplate() {
        assertThat(laborRiskNarrator).isInstanceOf(TemplateLaborRiskNarrator.class);
    }

    @Test
    @DisplayName("provider 미설정 — LlmLaborRiskNarrator 빈은 컨텍스트에 아예 생성되지 않는다")
    void llmBeanAbsentWhenProviderUnset() {
        assertThatThrownBy(() -> context.getBean(LlmLaborRiskNarrator.class))
                .isInstanceOf(NoSuchBeanDefinitionException.class);
    }
}
