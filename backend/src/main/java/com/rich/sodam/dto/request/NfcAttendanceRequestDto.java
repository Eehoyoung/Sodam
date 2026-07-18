package com.rich.sodam.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * NFC 전용 출퇴근 처리 요청 DTO.
 * GPS 좌표 없이 매장에 부착된 NFC 태그 태깅만으로 출근/퇴근을 기록할 때 사용한다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NfcAttendanceRequestDto {

    @NotNull(message = "직원 ID는 필수입니다.")
    private Long employeeId;

    @NotNull(message = "매장 ID는 필수입니다.")
    private Long storeId;

    @NotBlank(message = "NFC 태그 ID는 필수입니다.")
    private String tagId;

    /**
     * 오프라인 큐 적재 시각(ISO-8601, 옵셔널). 네트워크 끊김으로 단말이 출퇴근을 로컬 큐에 담아둔 경우,
     * 실제 발생 시각을 보존하기 위해 전송한다. null 이면 서버 수신 시각을 사용한다.
     * 임계(서버시각과의 차이)를 벗어나면 서버가 서버시각으로 폴백한다.
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime queuedAt;
}
