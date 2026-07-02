package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PolicyInfo;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 국가정책 정보 응답 DTO
 * 클라이언트에게 필요한 국가정책 정보만 반환하기 위한 데이터 전송 객체입니다.
 */
@Getter
@Builder
public class PolicyInfoResponseDto {
    private Long id;
    private String title;
    private String content;
    private String imagePath;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * PolicyInfo 엔티티를 PolicyInfoResponseDto로 변환
     *
     * @param policyInfo 국가정책 정보 엔티티
     * @return 변환된 응답 DTO
     */
    public static PolicyInfoResponseDto from(PolicyInfo policyInfo) {
        return PolicyInfoResponseDto.builder()
                .id(policyInfo.getId())
                .title(policyInfo.getTitle())
                .content(policyInfo.getContent())
                .imagePath(policyInfo.getImagePath())
                .createdAt(policyInfo.getCreatedAt())
                .updatedAt(policyInfo.getUpdatedAt())
                .build();
    }
}
