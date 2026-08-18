package com.rich.sodam.service.ai;

import java.util.List;

/**
 * HC-1(법적 확언 금지) 공용 금지어 목록 — {@code LlmLaborRiskNarrator}에서 추출(WP-0).
 *
 * <p>모든 LLM 텍스트 정제 도메인(노무 리스크·정정 사유·주간 브리핑·지원 메시지·채용공고·매입
 * 인사이트)이 이 목록을 공유한다. 도메인별 추가 금지어(예: WP-5의 Non-Goal 어휘, WP-4의 차별
 * 표현)는 이 목록에 섞지 말고 각 도메인 검증기에서 별도로 관리한다.</p>
 */
public final class ForbiddenPhrases {

    public static final List<String> LIST = List.of(
            "위반입니다", "막아드립니다", "막아줍니다", "정확하게 계산", "법적 자문", "안전합니다",
            "위반이다", "확정적으로", "무조건", "100% ");

    private ForbiddenPhrases() {
    }

    public static boolean containsAny(String text) {
        if (text == null) {
            return false;
        }
        for (String banned : LIST) {
            if (text.contains(banned)) {
                return true;
            }
        }
        return false;
    }
}
