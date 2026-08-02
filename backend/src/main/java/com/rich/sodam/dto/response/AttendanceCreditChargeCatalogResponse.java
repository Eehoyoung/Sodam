package com.rich.sodam.dto.response;

import java.util.List;

/**
 * {@code GET /api/attendance-credits/charge/packs} 응답 전체.
 *
 * @param packs                        상품 목록
 * @param firstPurchaseBonusAvailable  이 사장(호출자)이 첫 구매 2배 이벤트를 아직 쓰지 않았는지
 * @param firstPurchaseBonusMultiplier 첫 구매 보너스 배수(설정값)
 * @param promoCopyEnabled             "웰컴 2배" 등 프로모션 문구를 노출해도 되는지(§8 법무 검토 전 기본 false —
 *                                      false면 FE는 배지/문구를 숨기고 지급 로직 자체는 이 값과 무관하게 그대로 동작)
 */
public record AttendanceCreditChargeCatalogResponse(
        List<AttendanceCreditChargePackResponse> packs,
        boolean firstPurchaseBonusAvailable,
        int firstPurchaseBonusMultiplier,
        boolean promoCopyEnabled
) {
}
