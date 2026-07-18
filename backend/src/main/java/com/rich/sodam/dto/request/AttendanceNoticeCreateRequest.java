package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.AttendanceNoticeType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class AttendanceNoticeCreateRequest {

    @NotNull
    private Long storeId;

    @NotNull
    private LocalDate forDate;

    @NotNull
    private AttendanceNoticeType type;

    @Size(max = 300, message = "메시지는 300자 이내로 입력해 주세요.")
    private String message;
}
