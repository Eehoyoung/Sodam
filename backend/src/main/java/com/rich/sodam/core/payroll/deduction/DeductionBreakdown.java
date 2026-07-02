package com.rich.sodam.core.payroll.deduction;

/**
 * 4대보험 근로자 부담 항목별 공제 내역 (임금명세서 근로기준법 §48② 필수: 항목별 공제내역).
 *
 * @param nationalPension     국민연금
 * @param healthInsurance     건강보험
 * @param longTermCare        장기요양보험
 * @param employmentInsurance 고용보험
 */
public record DeductionBreakdown(int nationalPension,
                                 int healthInsurance,
                                 int longTermCare,
                                 int employmentInsurance) {

    public int total() {
        return nationalPension + healthInsurance + longTermCare + employmentInsurance;
    }
}
