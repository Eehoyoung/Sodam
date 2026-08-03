package com.rich.sodam.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 영수증 OCR provider on/off 빈 스위칭 배선 검증(2026-08-04).
 *
 * <p>이전에는 {@code @ConditionalOnProperty(name = "sodam.ocr.provider")}가 값의 존재 여부만 봐서,
 * 끄려는 의도로 {@code sodam.ocr.provider=false}를 넣어도 "값이 있으니" 오히려 CLOVA가 켜지는
 * 안전하지 않은 토글이었다. {@code havingValue = "clova"}로 좁혀 정확히 그 문자열일 때만 켜지도록
 * 고쳤고, 이 테스트는 그 스위칭이 실제로 의도대로 동작하는지 외부 호출 없이 검증한다.
 */
class ReceiptOcrClientWiringTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(NoopReceiptOcrClient.class, ClovaReceiptOcrClient.class);

    @Test
    void provider미설정_Noop만_활성화된다() {
        contextRunner.run(ctx -> {
            assertThat(ctx).hasSingleBean(ReceiptOcrClient.class);
            assertThat(ctx).hasSingleBean(NoopReceiptOcrClient.class);
            assertThat(ctx).doesNotHaveBean(ClovaReceiptOcrClient.class);
        });
    }

    @Test
    void provider_false로_끄려하면_실제로_꺼진다_회귀방지() {
        contextRunner.withPropertyValues("sodam.ocr.provider=false").run(ctx -> {
            assertThat(ctx).hasSingleBean(ReceiptOcrClient.class);
            assertThat(ctx).hasSingleBean(NoopReceiptOcrClient.class);
            assertThat(ctx).doesNotHaveBean(ClovaReceiptOcrClient.class);
        });
    }

    @Test
    void provider에_clova이외_문자열이면_꺼진_상태를_유지한다() {
        contextRunner.withPropertyValues("sodam.ocr.provider=naver-clova").run(ctx -> {
            assertThat(ctx).hasSingleBean(NoopReceiptOcrClient.class);
            assertThat(ctx).doesNotHaveBean(ClovaReceiptOcrClient.class);
        });
    }

    @Test
    void provider가_정확히_clova면_Clova가_Noop을_대체한다() {
        contextRunner.withPropertyValues("sodam.ocr.provider=clova").run(ctx -> {
            assertThat(ctx).hasSingleBean(ReceiptOcrClient.class);
            assertThat(ctx).hasSingleBean(ClovaReceiptOcrClient.class);
            assertThat(ctx).doesNotHaveBean(NoopReceiptOcrClient.class);
        });
    }
}
