package com.rich.sodam.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AttendanceIrregularityResolveRequest {

    @Size(max = 500, message = "메모는 500자 이내로 입력해 주세요.")
    private String note;
}
