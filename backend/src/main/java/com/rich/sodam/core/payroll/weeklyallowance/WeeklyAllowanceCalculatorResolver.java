package com.rich.sodam.core.payroll.weeklyallowance;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

/**
 * 주휴수당 전략 선택기 (시스템 core).
 *
 * <p>등록된 모든 {@link WeeklyAllowanceCalculator} 중 컨텍스트를 지원(supports)하는 전략을
 * 우선순위(priority) 내림차순으로 골라 계산한다. 새 전략 Bean 을 추가하면 자동 반영된다.</p>
 *
 * <p>지원 전략이 하나도 없으면(이론상 미달 전략이 항상 매칭되므로 도달 불가) 0원으로 안전 폴백한다.</p>
 */
@Slf4j
@Component
public class WeeklyAllowanceCalculatorResolver {

    private final List<WeeklyAllowanceCalculator> calculators;

    public WeeklyAllowanceCalculatorResolver(List<WeeklyAllowanceCalculator> calculators) {
        // 우선순위 내림차순 정렬 (높은 priority 가 먼저)
        this.calculators = calculators.stream()
                .sorted(Comparator.comparingInt(WeeklyAllowanceCalculator::priority).reversed())
                .toList();
    }

    public WeeklyAllowanceResult resolve(WeeklyAllowanceContext context) {
        for (WeeklyAllowanceCalculator calculator : calculators) {
            if (calculator.supports(context)) {
                WeeklyAllowanceResult result = calculator.calculate(context);
                if (log.isDebugEnabled()) {
                    log.debug("주휴수당 산정: 전략={}, 시간={}h, 금액={}원, 사유={}",
                            result.strategyName(), result.paidHours(), result.amount(), result.reason());
                }
                return result;
            }
        }
        log.warn("주휴수당 지원 전략 없음 — 0원 폴백. context={}", context);
        return WeeklyAllowanceResult.zero("NONE", "지원 전략 없음");
    }
}
