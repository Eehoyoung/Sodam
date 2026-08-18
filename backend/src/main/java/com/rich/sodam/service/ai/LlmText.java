package com.rich.sodam.service.ai;

import lombok.extern.slf4j.Slf4j;

import java.util.Optional;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * LLM 텍스트 생성 공통 골격 — WP-1~5의 다섯 기능이 같은 순서를 각자 구현하고 있었다.
 *
 * <p>순서: 클라이언트 준비 확인 → 프롬프트 실행 → trim → 검증 → 실패는 전부 {@code fallback}.
 * 기능마다 다른 것은 프롬프트와 검증 규칙뿐이라 그 둘만 인자로 받는다.</p>
 *
 * <p><b>실패 안전이 이 클래스의 계약이다.</b> provider 미설정(기본값)·네트워크 오류·검증 실패가
 * 전부 {@code fallback}으로 흡수되고 예외는 밖으로 나가지 않는다 — 호출부가 try-catch를 다시
 * 두지 않아도 된다. 프롬프트는 {@link Supplier}로 받아 클라이언트가 없으면 만들지도 않는다.</p>
 */
@Slf4j
public final class LlmText {

    private LlmText() {
    }

    /**
     * @param client    provider 설정에 따라 비어 있을 수 있는 생성 클라이언트
     * @param prompt    클라이언트가 준비된 경우에만 평가되는 프롬프트
     * @param validator 생성 결과 검증. false면 {@code fallback}을 쓴다
     * @param fallback  생성/검증 실패 시 돌려줄 값(원본 텍스트 또는 {@code null})
     * @param logTag    실패 로그에 남길 기능 이름
     */
    public static String tryGenerate(
            Optional<? extends TextGenerationClient> client,
            Supplier<String> prompt,
            Predicate<String> validator,
            String fallback,
            String logTag) {
        if (client.isEmpty() || !client.get().isReady()) {
            return fallback;
        }
        try {
            String response = client.get().complete(prompt.get());
            if (response == null) {
                return fallback;
            }
            String text = response.trim();
            return validator.test(text) ? text : fallback;
        } catch (Exception e) {
            log.debug("[{}] LLM 생성 실패 — 폴백 사용. cause={}", logTag, e.toString());
            return fallback;
        }
    }
}
