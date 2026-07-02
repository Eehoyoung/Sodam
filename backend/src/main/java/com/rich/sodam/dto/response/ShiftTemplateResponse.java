package com.rich.sodam.dto.response;

import com.rich.sodam.domain.ShiftTemplate;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 시프트 템플릿 응답. 목록은 {@link #summary}(엔트리 비움), 상세는 {@link #from}(엔트리 포함).
 */
public record ShiftTemplateResponse(
        Long id,
        Long storeId,
        String name,
        LocalDateTime createdAt,
        int entryCount,
        List<EntryResponse> entries
) {
    public record EntryResponse(
            Long employeeId,
            DayOfWeek dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            String memo
    ) {}

    public static ShiftTemplateResponse from(ShiftTemplate t) {
        List<EntryResponse> entries = t.getEntries().stream()
                .map(e -> new EntryResponse(e.getEmployeeId(), e.getDayOfWeek(),
                        e.getStartTime(), e.getEndTime(), e.getMemo()))
                .toList();
        return new ShiftTemplateResponse(t.getId(), t.getStoreId(), t.getName(),
                t.getCreatedAt(), entries.size(), entries);
    }

    public static ShiftTemplateResponse summary(ShiftTemplate t) {
        return new ShiftTemplateResponse(t.getId(), t.getStoreId(), t.getName(),
                t.getCreatedAt(), t.getEntries().size(), List.of());
    }
}
