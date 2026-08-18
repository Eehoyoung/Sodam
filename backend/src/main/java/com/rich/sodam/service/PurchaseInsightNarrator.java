package com.rich.sodam.service;

import com.rich.sodam.dto.response.MonthlySummaryResponse;
import com.rich.sodam.dto.response.VendorSummaryResponse;
import com.rich.sodam.service.ai.ForbiddenPhrases;
import com.rich.sodam.service.ai.LlmText;
import com.rich.sodam.service.ai.TextGenerationClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 매입장부 인사이트 코멘트(WP-5, {@code docs/260817} goal) — 거래처별 비중·월별 매입 추이를
 * 한두 문장 코멘트로 변환한다({@code PurchaseInsightScreen}의 두 데이터 소스 그대로 사용).
 *
 * <p><b>HC-9 Non-Goal 경계 최우선</b>: 이 앱은 재고 자동 차감·원가율·메뉴마진·POS 연동을 하지
 * 않는다(영구 Non-Goal, {@code docs/RELEASE_GATES.md} §7). 그런 표현이나 "재주문 추천"이 응답에
 * 섞이면 반드시 차단한다 — {@link ForbiddenPhrases}(HC-1)와는 별도로 이 도메인 전용 차단 어휘를
 * 관리한다.</p>
 */
@Service
public class PurchaseInsightNarrator {

    private static final int MAX_LENGTH = 200;
    private static final Pattern NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)*");
    private static final Pattern VENDOR_LABEL = Pattern.compile("거래처([A-Z])");

    /** HC-9: 매입장부 스코프 경계(재고차감·원가율·메뉴마진·POS연동·재주문추천) 차단 어휘. */
    static final List<String> NON_GOAL_TERMS = List.of(
            "재주문 추천", "재주문추천", "원가율", "메뉴마진", "메뉴 마진",
            "POS 연동", "POS연동", "재고 자동", "재고차감", "재고 차감");

    private final Optional<TextGenerationClient> client;

    public PurchaseInsightNarrator(Optional<TextGenerationClient> client) {
        this.client = client;
    }

    public String summarize(List<VendorSummaryResponse> vendors, List<MonthlySummaryResponse> months) {
        if ((vendors == null || vendors.isEmpty()) && (months == null || months.isEmpty())) {
            return null;
        }
        // 검증 3종(금지어·Non-Goal·입력 숫자/거래처 라벨 대조)은 LLM 출력이 신뢰 경계라 그대로 둔다.
        String comment = LlmText.tryGenerate(client, () -> buildPrompt(vendors, months),
                c -> passesValidation(c) && containsOnlyInputNumbers(c, vendors, months)
                        && containsOnlyKnownVendorLabels(c, Math.min(vendors.size(), 26)),
                null, "PurchaseInsightNarrator");
        return comment == null ? null : restoreVendorNames(comment, vendors);
    }

    static String buildPrompt(List<VendorSummaryResponse> vendors, List<MonthlySummaryResponse> months) {
        StringBuilder vendorPart = new StringBuilder();
        int vendorLimit = Math.min(vendors.size(), 26);
        for (int i = 0; i < vendorLimit; i++) {
            VendorSummaryResponse v = vendors.get(i);
            vendorPart.append("거래처").append((char) ('A' + i)).append("=").append(v.totalAmount()).append("원(")
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

    static boolean containsOnlyInputNumbers(
            String comment, List<VendorSummaryResponse> vendors, List<MonthlySummaryResponse> months) {
        Set<String> allowed = Stream.concat(
                        vendors.stream().flatMap(v -> Stream.of(
                                Integer.toString(v.totalAmount()), Integer.toString(v.purchaseCount()),
                                String.format("%.1f", v.sharePercent()))),
                        months.stream().flatMap(m -> Stream.of(
                                m.yearMonth(), Integer.toString(m.totalAmount()))))
                .flatMap(value -> extractNumbers(value).stream())
                .collect(Collectors.toSet());
        return allowed.containsAll(extractNumbers(comment));
    }

    private static Set<String> extractNumbers(String value) {
        Matcher matcher = NUMBER.matcher(value == null ? "" : value);
        HashSet<String> numbers = new HashSet<>();
        while (matcher.find()) {
            numbers.add(new BigDecimal(matcher.group().replace(",", "")).stripTrailingZeros().toPlainString());
        }
        return numbers;
    }

    private static boolean containsOnlyKnownVendorLabels(String comment, int vendorCount) {
        Matcher matcher = VENDOR_LABEL.matcher(comment);
        while (matcher.find()) {
            if (matcher.group(1).charAt(0) - 'A' >= vendorCount) {
                return false;
            }
        }
        return true;
    }

    private static String restoreVendorNames(String comment, List<VendorSummaryResponse> vendors) {
        String restored = comment;
        int vendorLimit = Math.min(vendors.size(), 26);
        for (int i = 0; i < vendorLimit; i++) {
            restored = restored.replace("거래처" + (char) ('A' + i), vendors.get(i).vendorName());
        }
        return restored;
    }
}
