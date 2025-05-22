package com.rich.sodam.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 출퇴근 처리 요청 DTO
 * 출근/퇴근 API 요청시 필요한 정보를 담는 데이터 전송 객체입니다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRequestDto {

    @NotNull(message = "직원 ID는 필수입니다.")
    private Long employeeId;

    @NotNull(message = "매장 ID는 필수입니다.")
    private Long storeId;

    @NotNull(message = "위도는 필수입니다.")
    private Double latitude;

    @NotNull(message = "경도는 필수입니다.")
    private Double longitude;
}