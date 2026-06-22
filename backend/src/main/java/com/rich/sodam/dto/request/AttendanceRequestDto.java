package com.rich.sodam.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    /**
     * 오프라인 큐 적재 시각(ISO-8601, 옵셔널). 네트워크 끊김으로 단말이 출퇴근을 로컬 큐에 담아둔 경우,
     * 실제 발생 시각을 보존하기 위해 전송한다. null 이면 서버 수신 시각을 사용한다.
     * 임계(서버시각과의 차이)를 벗어나면 서버가 서버시각으로 폴백한다.
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime queuedAt;
}