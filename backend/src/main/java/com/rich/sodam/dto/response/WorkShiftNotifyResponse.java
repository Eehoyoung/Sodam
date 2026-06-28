package com.rich.sodam.dto.response;

import java.time.LocalDate;

public record WorkShiftNotifyResponse(
        Long storeId,
        LocalDate from,
        LocalDate to,
        int confirmedCount,
        int notifiedCount
) {
}
