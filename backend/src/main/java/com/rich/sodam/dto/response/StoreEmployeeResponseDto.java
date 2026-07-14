package com.rich.sodam.dto.response;

import com.rich.sodam.domain.User;
import lombok.Getter;

/**
 * 매장 직원 명부 응답 DTO (findings_report.md §2 — PII 노출 확정 실측 수정).
 *
 * <p>이전에는 {@code GET /api/stores/{storeId}/employees} 가 {@link User} 엔티티를 그대로
 * 반환해 email/동의 시각/탈퇴·익명화 시각까지 응답에 그대로 노출됐다. 사장이 직원 로스터에서
 * 볼 업무상 정당성이 있는 필드(이름·연락처·역할)만 선별한다.</p>
 */
@Getter
public class StoreEmployeeResponseDto {

    private final Long id;
    private final String name;
    private final String email;
    private final String phone;
    private final String userGrade;

    private StoreEmployeeResponseDto(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.userGrade = user.getUserGrade() != null ? user.getUserGrade().name() : null;
    }

    public static StoreEmployeeResponseDto from(User user) {
        return new StoreEmployeeResponseDto(user);
    }
}
