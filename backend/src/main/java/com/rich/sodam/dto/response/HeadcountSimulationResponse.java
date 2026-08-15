package com.rich.sodam.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * 상시근로자 수 전환 시뮬레이션 응답 — 직원을 N명 더 채용하면 근로기준법 시행령 §7의2 기준
 * 5인 이상 경계를 넘는지, 새로 적용될 조항이 무엇인지, 인건비 영향 범위를 반환한다(사장 전용).
 *
 * <p>인건비 영향은 단일 금액이 아니라 범위다(HC-1) — 신규 채용 인원의 근로시간을 알 수 없으므로
 * 단시간(하한)~주 40h 상근 환산(상한) 사이로 추정한다.
 *
 * @param crossesThreshold           현재 경계 미만이고, 추가 채용 시 경계 이상으로 넘어가는지
 * @param newlyApplicableProvisions  경계를 넘을 때만 채워지는 참고 조항 목록(넘지 않으면 빈 배열)
 * @param estimatedMonthlyCostMin    추가 인원 월 인건비 영향 추정 하한(원)
 * @param estimatedMonthlyCostMax    추가 인원 월 인건비 영향 추정 상한(원)
 * @param disclaimer                 면책 문구 — 화면 상시 노출
 */
public record HeadcountSimulationResponse(
        Long storeId,
        BigDecimal currentStatutoryHeadcount,
        int additionalEmployees,
        BigDecimal projectedStatutoryHeadcount,
        boolean crossesThreshold,
        List<String> newlyApplicableProvisions,
        BigDecimal estimatedMonthlyCostMin,
        BigDecimal estimatedMonthlyCostMax,
        String disclaimer
) {
}
