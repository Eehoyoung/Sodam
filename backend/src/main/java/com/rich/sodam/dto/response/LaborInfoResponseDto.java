package com.rich.sodam.dto.response;

import com.rich.sodam.domain.LaborInfo;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 노무 정보 응답 DTO
 * 클라이언트에게 필요한 노무 정보만 반환하기 위한 데이터 전송 객체입니다.
 */
@Getter
@Builder
public class LaborInfoResponseDto {
    private Long id;
    private String title;
    private String content;
    private String imagePath;

    // 노무 기준값 필드들 (CRITICAL-BE-003)
    private Integer minimumWage; // 최저임금
    private Integer year; // 적용 연도
    private Integer weeklyMaxHours; // 주당 최대 근무시간
    private Double overtimeRate; // 초과근무 수당 배율

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * LaborInfo 엔티티를 LaborInfoResponseDto로 변환
     *
     * @param laborInfo 노무 정보 엔티티
     * @return 변환된 응답 DTO
     */
    public static LaborInfoResponseDto from(LaborInfo laborInfo) {
        return LaborInfoResponseDto.builder()
                .id(laborInfo.getId())
                .title(laborInfo.getTitle())
                .content(laborInfo.getContent())
                .imagePath(laborInfo.getImagePath())
                .minimumWage(laborInfo.getMinimumWage())
                .year(laborInfo.getYear())
                .weeklyMaxHours(laborInfo.getWeeklyMaxHours())
                .overtimeRate(laborInfo.getOvertimeRate())
                .createdAt(laborInfo.getCreatedAt())
                .updatedAt(laborInfo.getUpdatedAt())
                .build();
    }
}
