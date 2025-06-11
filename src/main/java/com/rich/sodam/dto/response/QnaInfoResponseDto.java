package com.rich.sodam.dto.response;

import com.rich.sodam.domain.QnaInfo;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 사이트 질문 응답 DTO
 * 클라이언트에게 필요한 사이트 질문 정보만 반환하기 위한 데이터 전송 객체입니다.
 */
@Getter
@Builder
public class QnaInfoResponseDto {
    private Long id;
    private String title;
    private String question;
    private String answer;
    private String imagePath;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * QnaInfo 엔티티를 QnaInfoResponseDto로 변환
     *
     * @param qnaInfo 사이트 질문 엔티티
     * @return 변환된 응답 DTO
     */
    public static QnaInfoResponseDto from(QnaInfo qnaInfo) {
        return QnaInfoResponseDto.builder()
                .id(qnaInfo.getId())
                .title(qnaInfo.getTitle())
                .question(qnaInfo.getQuestion())
                .answer(qnaInfo.getAnswer())
                .imagePath(qnaInfo.getImagePath())
                .createdAt(qnaInfo.getCreatedAt())
                .updatedAt(qnaInfo.getUpdatedAt())
                .build();
    }
}
