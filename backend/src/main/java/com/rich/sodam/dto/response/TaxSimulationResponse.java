package com.rich.sodam.dto.response;

/**
 * 세무 시뮬레이터 결과 (T-NEW-05). 매출−지출 → 예상 종합소득세(참고용).
 *
 * @param income         연 매출/수입
 * @param expenses       연 지출/경비
 * @param taxableIncome  과세표준(수입−경비, 음수면 0)
 * @param estimatedTax   예상 산출세액(누진공제 적용)
 * @param effectiveRate  실효세율(%) — 소수 1자리
 * @param disclaimer     면책(참고용·세무사 검토 전)
 */
public record TaxSimulationResponse(
        long income,
        long expenses,
        long taxableIncome,
        long estimatedTax,
        double effectiveRate,
        String disclaimer
) {
}
