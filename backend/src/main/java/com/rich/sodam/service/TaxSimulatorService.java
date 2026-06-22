package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.IncomeTaxBrackets;
import com.rich.sodam.dto.response.TaxSimulationResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 세무 시뮬레이터 (T-NEW-05). 매출·지출 입력 → 예상 종합소득세 개략치.
 *
 * <p>저장하지 않는 순수 계산. <b>참고용 추정</b>(누진세율표 기준) — 실제 신고는 세무사 검토 필요.
 */
@Service
public class TaxSimulatorService {

    static final String DISCLAIMER =
            "참고용 추정이에요. 실제 세액은 공제·감면에 따라 달라지니 세무사 검토가 필요해요.";

    public TaxSimulationResponse simulate(long income, long expenses) {
        long safeIncome = Math.max(0, income);
        long safeExpenses = Math.max(0, expenses);
        long taxable = Math.max(0, safeIncome - safeExpenses);
        long tax = IncomeTaxBrackets.estimatedTax(taxable);

        double effectiveRate = safeIncome > 0
                ? BigDecimal.valueOf(tax * 100.0 / safeIncome).setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        return new TaxSimulationResponse(safeIncome, safeExpenses, taxable, tax, effectiveRate, DISCLAIMER);
    }
}
