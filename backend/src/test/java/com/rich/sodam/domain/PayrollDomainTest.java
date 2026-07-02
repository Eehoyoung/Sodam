package com.rich.sodam.domain;

import com.rich.sodam.domain.type.PayrollStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 급여(Payroll) 도메인 계산 단위 테스트.
 *
 * 한국 노동법 기준:
 *  - 연장 1.5배, 야간 1.5배 (중복 시 2.0배는 wage 합산 단계에서 처리)
 *  - 주휴수당: 주 15시간 이상 + 결근 없을 시 별도
 *  - 사업소득세 원천징수 3.3%
 */
class PayrollDomainTest {

    private Payroll buildBasic() {
        Payroll p = new Payroll();
        p.setRegularHours(160.0);
        p.setRegularWage(1_920_000);  // 160h × 12,000
        p.setOvertimeHours(10.0);
        p.setOvertimeWage(180_000);   // 10h × 18,000 (12,000 × 1.5)
        p.setNightWorkHours(5.0);
        p.setNightWorkWage(90_000);   // 5h × 18,000
        p.setWeeklyAllowance(48_000); // 1주 추가 (4주 평균)
        return p;
    }

    @Test
    void 총급여_각구성요소합산() {
        Payroll p = buildBasic();
        p.calculateGrossWage();

        // 1,920,000 + 180,000 + 90,000 + 48,000 = 2,238,000
        assertEquals(2_238_000, p.getGrossWage());
    }

    @Test
    void 세금_3_3퍼센트_원천징수() {
        Payroll p = buildBasic();
        p.calculateGrossWage();
        p.calculateTax(0.033);

        // 2,238,000 × 0.033 = 73,854 (반올림)
        assertEquals(73_854, p.getTaxAmount());
    }

    @Test
    void 실수령액_세금공제후() {
        Payroll p = buildBasic();
        p.calculateGrossWage();
        p.calculateTax(0.033);
        p.calculateNetWage();

        // 2,238,000 - 73,854 - 0 = 2,164,146
        assertEquals(2_164_146, p.getNetWage());
    }

    @Test
    void 추가공제포함_실수령액() {
        Payroll p = buildBasic();
        p.calculateGrossWage();
        p.calculateTax(0.033);
        p.setDeductions(50_000); // 식대 가불 공제 등
        p.calculateNetWage();

        // 2,238,000 - 73,854 - 50,000 = 2,114,146
        assertEquals(2_114_146, p.getNetWage());
    }

    @Test
    void 일부필드null이면_총급여계산제외() {
        Payroll p = new Payroll();
        p.setRegularWage(1_000_000);
        // overtime/night/weekly 는 null
        p.calculateGrossWage();
        assertEquals(1_000_000, p.getGrossWage());
    }

    @Test
    void 기본상태_DRAFT() {
        Payroll p = new Payroll();
        assertEquals(PayrollStatus.DRAFT, p.getStatus());
    }

    @Test
    void 상태변경() {
        Payroll p = new Payroll();
        p.setStatus(PayrollStatus.PAID);
        assertEquals(PayrollStatus.PAID, p.getStatus());
    }
}
