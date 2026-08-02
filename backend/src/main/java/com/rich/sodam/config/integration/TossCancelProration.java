package com.rich.sodam.config.integration;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 토스 결제취소 웹훅의 "취소 금액"을 파싱하고, 그 금액을 원래 주문 금액 대비 비율로 환산해
 * 재화/기간 회수 수량을 비례 계산하는 순수 유틸리티(recruitment-monetization-gamification-plan.md
 * §12.2 — 세무 검토 "환불금액과 회수량이 연동되지 않는 문제" 수정).
 *
 * <p><b>왜 필요한가</b>: 기존에는 {@code CANCELED}/{@code PARTIAL_CANCELED} 웹훅을 동일하게 취급해
 * 취소 금액과 무관하게 항상 주문 전체 수량/일수를 회수했다 — 5,000원 부분환불도 전액환불과 같은
 * 파급력을 가졌다는 뜻이다. 이 클래스는 웹훅 payload에서 실제 취소 금액을 뽑아내고, 그 금액이
 * 원래 결제금액의 몇 %인지로 회수 수량을 다시 계산한다.</p>
 *
 * <p><b>반올림 방향</b>: 회수 수량은 항상 <b>버림(floor)</b>한다 — 사용자에게 불리한 방향(더 많이
 * 회수)이 아니라 사업자가 손해를 보는 방향(더 적게 회수)을 택한다. 정수 나눗셈(long 산술)을 그대로
 * 쓰면 음수가 아닌 값에서는 자연히 floor와 같다.</p>
 */
public final class TossCancelProration {

    private TossCancelProration() {
    }

    /**
     * 웹훅 payload에서 파싱한 취소 금액 원시값. 아래 우선순위로 하나만 채워지거나, 둘 다 없을 수 있다.
     *
     * @param cancelAmountKrw  이번 취소 이벤트의 취소 금액(토스 {@code cancels} 배열의 마지막 원소
     *                         {@code cancelAmount}, 또는 최상위 {@code cancelAmount} 필드)
     * @param balanceAmountKrw 취소 후 남은(미취소) 금액 — {@code cancelAmountKrw}가 없을 때 원금에서
     *                         역산하는 폴백 신호로 쓴다
     */
    public record ParsedCancelAmount(Integer cancelAmountKrw, Integer balanceAmountKrw) {
        public static final ParsedCancelAmount EMPTY = new ParsedCancelAmount(null, null);
    }

    /** 비례 회수 계산 결과. */
    public record Proration(Integer resolvedCancelAmountKrw, BigDecimal cancelRatio, int proratedQuantity) {
    }

    /**
     * 토스 웹훅 {@code data} 노드에서 취소 금액 관련 필드를 파싱한다. 실제 토스 Payment 객체는
     * {@code cancels}(배열, 각 원소가 {@code cancelAmount} 보유) + 최상위 {@code balanceAmount}
     * (미취소 잔액) 구조다 — 방어적으로 최상위 {@code cancelAmount}(mock/테스트 payload 단순화 대비)도
     * 함께 시도한다. 아무 필드도 없으면 {@link ParsedCancelAmount#EMPTY}를 반환한다(취소 사유는 있지만
     * 금액 정보가 없는 payload — 호출자는 {@link #prorate}에서 안전 기본값(전량 회수)으로 처리한다).
     */
    public static ParsedCancelAmount parseFromWebhookData(JsonNode dataNode) {
        if (dataNode == null || dataNode.isMissingNode() || dataNode.isNull()) {
            return ParsedCancelAmount.EMPTY;
        }

        Integer cancelAmountKrw = null;
        JsonNode cancels = dataNode.path("cancels");
        if (cancels.isArray() && !cancels.isEmpty()) {
            JsonNode lastCancel = cancels.get(cancels.size() - 1);
            JsonNode amountNode = lastCancel.path("cancelAmount");
            if (amountNode.isNumber()) {
                cancelAmountKrw = amountNode.asInt();
            }
        }
        if (cancelAmountKrw == null) {
            JsonNode topLevelCancelAmount = dataNode.path("cancelAmount");
            if (topLevelCancelAmount.isNumber()) {
                cancelAmountKrw = topLevelCancelAmount.asInt();
            }
        }

        Integer balanceAmountKrw = null;
        JsonNode balanceNode = dataNode.path("balanceAmount");
        if (balanceNode.isNumber()) {
            balanceAmountKrw = balanceNode.asInt();
        }

        return new ParsedCancelAmount(cancelAmountKrw, balanceAmountKrw);
    }

    /**
     * 취소 비율만큼 {@code originalQuantity}를 비례 회수한다.
     *
     * @param parsed           {@link #parseFromWebhookData}의 결과
     * @param originalAmountKrw 이 주문의 원래 결제 금액(서버 보관값 — {@code order.getAmountKrw()})
     * @param originalQuantity  전액취소 시 회수했어야 할 원래 수량/일수
     */
    public static Proration prorate(ParsedCancelAmount parsed, int originalAmountKrw, int originalQuantity) {
        if (originalAmountKrw <= 0 || originalQuantity <= 0) {
            // 금액/수량 정보가 아예 없으면 비율 계산이 무의미 — 기존 동작(전량 회수)으로 안전하게 폴백.
            return new Proration(parsed.cancelAmountKrw(), BigDecimal.ONE, originalQuantity);
        }

        Integer resolved = parsed.cancelAmountKrw();
        if (resolved == null && parsed.balanceAmountKrw() != null) {
            resolved = Math.max(0, originalAmountKrw - parsed.balanceAmountKrw());
        }
        if (resolved == null) {
            // 취소 금액 정보를 전혀 파싱하지 못함 — 레거시 동작과 동일하게 전액취소로 간주(전량 회수).
            // status가 CANCELED(전액취소)인 케이스는 실제로도 비율이 1.0이라 결과가 같다.
            return new Proration(null, BigDecimal.ONE, originalQuantity);
        }

        int clamped = Math.max(0, Math.min(resolved, originalAmountKrw));
        BigDecimal ratio = BigDecimal.valueOf(clamped)
                .divide(BigDecimal.valueOf(originalAmountKrw), 6, RoundingMode.HALF_UP);
        // 정수(long) 나눗셈은 음수가 없는 범위에서 floor와 동일 — 사업자가 손해보는 방향으로 버림.
        int proratedQuantity = (int) ((long) originalQuantity * clamped / originalAmountKrw);
        return new Proration(clamped, ratio, proratedQuantity);
    }
}
