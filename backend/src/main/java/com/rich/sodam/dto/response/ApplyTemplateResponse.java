package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * 템플릿 적용 결과. 비활성/퇴사 직원 엔트리는 생성하지 않고 {@code skipped}에 사유와 함께 보고한다.
 */
public record ApplyTemplateResponse(
        Long templateId,
        LocalDate weekStart,
        int createdCount,
        int skippedCount,
        List<SkippedEntry> skipped
) {
    public record SkippedEntry(
            Long employeeId,
            String dayOfWeek,
            String reason
    ) {}
}
