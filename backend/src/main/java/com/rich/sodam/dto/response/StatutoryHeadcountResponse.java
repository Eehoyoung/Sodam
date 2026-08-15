package com.rich.sodam.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 근로기준법 시행령 §7의2 상시근로자 수 참고 산정 + 확대적용 로드맵 응답(사장 전용).
 *
 * <p>세무(통합고용세액공제) 상시근로자 집계({@code EmploymentCreditService.headcountTrend})와는
 * 별개 산식·별개 값이다 — 같은 화면에 두 숫자를 함께 노출하지 않는다.
 *
 * @param operatingDays        산정기간 중 가동일수(직원이 실제 근무한 날)
 * @param manDays               산정기간 중 근로자 연인원 합계
 * @param statutoryHeadcount    참고 산정 상시근로자 수(연인원 ÷ 가동일수)
 * @param meetsThreshold        참고 산정값이 5인 이상 경계를 충족하는지
 * @param roadmap               정부 추진 확대적용 로드맵(미확정 정책)
 * @param disclaimer            면책 문구 — 화면 상시 노출
 */
public record StatutoryHeadcountResponse(
        Long storeId,
        LocalDate periodStart,
        LocalDate periodEnd,
        int operatingDays,
        int manDays,
        BigDecimal statutoryHeadcount,
        boolean meetsThreshold,
        List<RoadmapItem> roadmap,
        String disclaimer
) {
    public record RoadmapItem(int stage, int expectedYear, String title, String description) {
    }
}
