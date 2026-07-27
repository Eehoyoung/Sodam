package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 급여 정산 마법사 일괄 확정 결과 — 확정(발급)된 급여 전체를 한 번에 반환한다.
 */
public record PayrollWizardConfirmResponse(
        Long storeId,
        int issuedCount,
        List<PayrollDto> issued
) {
    public static PayrollWizardConfirmResponse of(Long storeId, List<PayrollDto> issued) {
        return new PayrollWizardConfirmResponse(storeId, issued.size(), issued);
    }
}
