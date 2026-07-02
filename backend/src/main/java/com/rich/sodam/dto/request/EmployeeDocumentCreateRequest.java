package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 직원 서류 추가 요청 (A5). 원본 파일은 fileRef 참조만(원본·PII 미저장).
 */
@Getter
@Setter
public class EmployeeDocumentCreateRequest {

    @NotNull(message = "서류 종류를 선택해 주세요.")
    private DocumentType type;

    @NotBlank(message = "서류 제목을 입력해 주세요.")
    private String title;

    private String fileRef;

    private LocalDate issuedAt;

    /** 만료일(보건증 등). 없으면 만료 관리 안 함. */
    private LocalDate expiresAt;
}
