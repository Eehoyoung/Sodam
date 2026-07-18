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

    private StoreEmployeeResponseDto(Long id, String name, String email, String phone, String userGrade) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.userGrade = userGrade;
    }

    public static StoreEmployeeResponseDto from(User user) {
        return new StoreEmployeeResponseDto(user);
    }

    public StoreEmployeeResponseDto maskedForManager() {
        return new StoreEmployeeResponseDto(id, name, maskEmail(email), maskPhone(phone), userGrade);
    }

    private static String maskPhone(String value) {
        if (value == null || value.length() < 7) return null;
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() < 7) return null;
        return digits.substring(0, 3) + "****" + digits.substring(digits.length() - 4);
    }

    private static String maskEmail(String value) {
        if (value == null || !value.contains("@")) return null;
        int at = value.indexOf('@');
        String local = value.substring(0, at);
        String visible = local.isEmpty() ? "" : local.substring(0, 1);
        return visible + "***" + value.substring(at);
    }
}
