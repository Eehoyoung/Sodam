package com.rich.sodam.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

/**
 * 사이트 질문 요청 DTO
 * 사이트 질문 생성 및 수정 요청에 사용되는 데이터 전송 객체입니다.
 */
@Getter
@Setter
@NoArgsConstructor
public class QnaInfoRequestDto {

    private String title;

    private String question;

    private String answer;

    private MultipartFile image;
}
