package com.rich.sodam.service;

import com.rich.sodam.dto.response.LaborHealthResponse;
import com.rich.sodam.dto.response.LaborHealthResponse.SummaryItem;
import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 노무 건강도 요약 (WP-7). {@link LaborRiskService#analyze(Long)}의 판정을 그대로 재사용해
 * 0~100 참고 점수 + 건수로 집계한다(신규 테이블 없음, 판정 자체를 다시 계산하지 않음).
 */
@Service
@RequiredArgsConstructor
public class LaborHealthScoreService {

    /** DANGER 1건당 감점. */
    static final int DANGER_PENALTY = 15;
    /** WARN 1건당 감점. */
    static final int WARN_PENALTY = 5;
    static final int MIN_SCORE = 0;
    static final int MAX_SCORE = 100;

    static final String DISCLAIMER =
            "참고용 점수예요. 확인이 필요한 항목 수를 반영한 것으로 법 위반 여부를 확정하지 않아요. "
                    + "최종 판단은 근로감독관·법원의 권한입니다.";

    private final LaborRiskService laborRiskService;

    @Transactional(readOnly = true)
    public LaborHealthResponse summarize(Long storeId, boolean includeDetail) {
        List<Item> riskItems = laborRiskService.analyze(storeId).items();

        int dangerCount = 0;
        int warnCount = 0;
        for (Item item : riskItems) {
            if (item.severity() == Severity.DANGER) {
                dangerCount++;
            } else {
                warnCount++;
            }
        }
        int score = Math.max(MIN_SCORE,
                MAX_SCORE - dangerCount * DANGER_PENALTY - warnCount * WARN_PENALTY);

        List<SummaryItem> items = riskItems.stream()
                .map(item -> new SummaryItem(item.type(), item.severity(), item.employeeId(),
                        item.employeeName(), includeDetail ? item.message() : null))
                .toList();

        return new LaborHealthResponse(storeId, score, dangerCount, warnCount,
                dangerCount + warnCount, items, DISCLAIMER);
    }
}
