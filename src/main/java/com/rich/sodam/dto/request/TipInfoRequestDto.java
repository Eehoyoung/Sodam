package com.rich.sodam.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

/**
 * 소상공인 꿀팁 요청 DTO
 * 소상공인 꿀팁 생성 및 수정 요청에 사용되는 데이터 전송 객체입니다.
 */
@Getter
@Setter
@NoArgsConstructor
public class TipInfoRequestDto {

    private String title;

    private String content;

    private MultipartFile image;
}
