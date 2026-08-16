package com.rich.sodam.service;

import com.rich.sodam.dto.response.MonthlySummaryResponse;
import com.rich.sodam.dto.response.VendorSummaryResponse;
import com.rich.sodam.service.ai.AnthropicTextClient;
import com.rich.sodam.service.ai.ForbiddenPhrases;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 매입장부 인사이트 코멘트(WP-5, {@code docs/260817} goal) — 거래처별 비중·월별 매입 추이를
 * 한두 문장 코멘트로 변환한다({@code PurchaseInsightScreen}의 두 데이터 소스 그대로 사용).
 *
 * <p><b>HC-9 Non-Goal 경계 최우선</b>: 이 앱은 재고 자동 차감·원가율·메뉴마진·POS 연동을 하지
 * 않는다(영구 Non-Goal, {@code docs/RELEASE_GATES.md} §7). 그런 표현이나 "재주문 추천"이 응답에
 * 섞이면 반드시 차단한다 — {@link ForbiddenPhrases}(HC-1)와는 별도로 이 도메인 전용 차단 어휘를
 * 관리한다.</p>
 */
@Slf4j
@Service
public class PurchaseInsightNarrator {

    private static final int MAX_LENGTH = 200;

    /** HC-9: 매입장부 스코프 경계(재고차감·원가율·메뉴마진·POS연동·재주문추천) 차단 어휘. */
    static final List<String> NON_GOAL_TERMS = List.of(
            "재주문 추천", "재주문추천", "원가율", "메뉴마진", "메뉴 마진",
            "POS 연동", "POS연동", "재고 자동", "재고차감", "재고 차감");

    private final Optional<AnthropicTextClient> client;

    public PurchaseInsightNarrator(Optional<AnthropicTextClient> client) {
        this.client = client;
    }

    public String summarize(List<VendorSummaryResponse> vendors, List<MonthlySummaryResponse> months) {
        if (client.isEmpty() || !client.get().isReady()
                || (vendors == null || vendors.isEmpty()) && (months == null || months.isEmpty())) {
            return null;
        }
        try {
            String response = client.get().complete(buildPrompt(vendors, months));
            if (response == null) {
                return null;
            }
            String comment = response.trim();
            return passesValidation(comment) ? comment : null;
        } catch (Exception e) {
            log.debug("[PurchaseInsightNarrator] 코멘트 생성 실패. cause={}", e.toString());
            return null;
        }
    }

    static String buildPrompt(List<VendorSummaryResponse> vendors, List<MonthlySummaryResponse> months) {
        StringBuilder vendorPart = new StringBuilder();
        for (VendorSummaryResponse v : vendors) {
            vendorPart.append(v.vendorName()).append("=").append(v.totalAmount()).append("원(")
                    .append(String.format("%.1f", v.sharePercent())).append("%), ");
        }
        StringBuilder monthPart = new StringBuilder();
        for (MonthlySummaryResponse m : months) {
            monthPart.append(m.yearMonth()).append("=").append(m.totalAmount()).append("원, ");
        }
        return "다음은 소상공인 매입장부의 거래처별 비중과 월별 매입 합계다. 매입 기록·비교 관점에서만 "
                + "한두 문장으로 코멘트하라. 이 앱은 재고 자동 차감·원가율 계산·메뉴 마진 분석·POS 연동을 "
                + "하지 않는다 — 그런 표현이나 재주문 추천을 절대 쓰지 마라. "
                + "법적 확언(위반이다/막아준다/안전합니다/정확하다 등)도 쓰지 마라.\n\n"
                + "거래처별 비중: " + vendorPart + "\n월별 합계: " + monthPart;
    }

    /** HC-1 공용 금지어 + HC-9 Non-Goal 차단 어휘 + 길이 제약. */
    static boolean passesValidation(String comment) {
        if (comment == null || comment.isBlank()) {
            return false;
        }
        if (comment.length() > MAX_LENGTH) {
            return false;
        }
        if (ForbiddenPhrases.containsAny(comment)) {
            return false;
        }
        for (String term : NON_GOAL_TERMS) {
            if (comment.contains(term)) {
                return false;
            }
        }
        return true;
    }
}
