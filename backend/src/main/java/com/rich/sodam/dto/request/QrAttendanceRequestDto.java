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
 * QR 전용 출퇴근 처리 요청 DTO (WP-C).
 *
 * <p>GPS 좌표 없이 매장에 게시된 QR 스캔만으로 출근/퇴근을 기록한다. iOS 는 NFC 가 1차 출시에서
 * 빠졌고 GPS 는 실내 오차가 커서, 두 플랫폼 모두 되는 경로로 도입했다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrAttendanceRequestDto {

    @NotNull(message = "직원 ID는 필수입니다.")
    private Long employeeId;

    @NotNull(message = "매장 ID는 필수입니다.")
    private Long storeId;

    /** QR 에서 읽은 토큰. 서버가 매장 일치·유효기간을 함께 검증한다(대리출근 방지). */
    @NotBlank(message = "QR 토큰은 필수입니다.")
    private String qrToken;

    /**
     * 오프라인 큐 적재 시각(ISO-8601, 옵셔널). NFC 경로와 동일한 의미.
     * null 이면 서버 수신 시각을 사용하며, 임계를 벗어나면 서버시각으로 폴백한다.
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime queuedAt;
}
