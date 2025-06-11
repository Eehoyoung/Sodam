package com.rich.sodam.dto.response;

import com.rich.sodam.domain.TaxInfo;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 세무 정보 응답 DTO
 * 클라이언트에게 필요한 세무 정보만 반환하기 위한 데이터 전송 객체입니다.
 */
@Getter
@Builder
public class TaxInfoResponseDto {
    private Long id;
    private String title;
    private String content;
    private String imagePath;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * TaxInfo 엔티티를 TaxInfoResponseDto로 변환
     *
     * @param taxInfo 세무 정보 엔티티
     * @return 변환된 응답 DTO
     */
    public static TaxInfoResponseDto from(TaxInfo taxInfo) {
        return TaxInfoResponseDto.builder()
                .id(taxInfo.getId())
                .title(taxInfo.getTitle())
                .content(taxInfo.getContent())
                .imagePath(taxInfo.getImagePath())
                .createdAt(taxInfo.getCreatedAt())
                .updatedAt(taxInfo.getUpdatedAt())
                .build();
    }
}
