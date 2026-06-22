package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 직원 온보딩 체크리스트 (M-NEW-05 사장 / E-NEW-08 직원).
 *
 * <p>계약서 서명·시급 설정·첫 출근 단계의 완료 상태를 묶어 보여준다(기존 데이터 집계).
 *
 * @param steps          단계 목록(순서=우선순위)
 * @param completedCount 완료 단계 수
 * @param total          전체 단계 수
 * @param nextStepKey    다음 할 단계 키(전부 완료면 null)
 * @param nextStepLabel  다음 할 단계 라벨
 */
public record OnboardingResponse(
        Long employeeId,
        Long storeId,
        List<Step> steps,
        int completedCount,
        int total,
        String nextStepKey,
        String nextStepLabel
) {
    public record Step(String key, String label, boolean done) {
    }
}
