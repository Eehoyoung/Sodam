package com.rich.sodam.dto.response;

import com.rich.sodam.domain.User;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 사용자 정보 응답 DTO.
 *
 * <p>User 엔티티를 직접 직렬화하면 {@code password} 해시·약관 동의 시점 등 민감 필드가
 * 그대로 노출된다(개인정보보호법 §29 위반). 본 DTO 는 클라이언트에 필요한 필드만 노출한다.
 * <b>password 는 절대 포함하지 않는다.</b></p>
 */
@Getter
public class UserResponseDto {

    private final Long id;
    private final String email;
    private final String name;
    private final String role;
    private final String phone;
    private final LocalDate birthDate;
    private final boolean profileCompleted;
    /** 필수 약관 동의 완료 여부 — false 면 FE 가 동의 화면으로 라우팅(소셜 가입 G-2 대응). */
    private final boolean consentCompleted;
    /** 위치정보 동의 여부 — GPS 출퇴근 진입 가능 판정. */
    private final boolean locationConsented;
    private final LocalDateTime createdAt;

    private UserResponseDto(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.role = user.getUserGrade() != null ? user.getUserGrade().name() : null;
        this.phone = user.getPhone();
        this.birthDate = user.getBirthDate();
        this.profileCompleted = user.isProfileCompleted();
        this.consentCompleted = user.hasCompletedRequiredConsents();
        this.locationConsented = user.hasAgreedLocationInfo();
        this.createdAt = user.getCreatedAt();
    }

    public static UserResponseDto from(User user) {
        return new UserResponseDto(user);
    }
}
