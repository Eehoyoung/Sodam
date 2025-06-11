package com.rich.sodam.dto.response;

import com.rich.sodam.domain.TipInfo;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 소상공인 꿀팁 응답 DTO
 * 클라이언트에게 필요한 소상공인 꿀팁 정보만 반환하기 위한 데이터 전송 객체입니다.
 */
@Getter
@Builder
public class TipInfoResponseDto {
    private Long id;
    private String title;
    private String content;
    private String imagePath;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * TipInfo 엔티티를 TipInfoResponseDto로 변환
     *
     * @param tipInfo 소상공인 꿀팁 엔티티
     * @return 변환된 응답 DTO
     */
    public static TipInfoResponseDto from(TipInfo tipInfo) {
        return TipInfoResponseDto.builder()
                .id(tipInfo.getId())
                .title(tipInfo.getTitle())
                .content(tipInfo.getContent())
                .imagePath(tipInfo.getImagePath())
                .createdAt(tipInfo.getCreatedAt())
                .updatedAt(tipInfo.getUpdatedAt())
                .build();
    }
}
