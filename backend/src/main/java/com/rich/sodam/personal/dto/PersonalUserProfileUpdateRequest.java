package com.rich.sodam.personal.dto;

import lombok.Data;

/**
 * 개인 사용자 프로필 수정 요청 DTO
 */
@Data
public class PersonalUserProfileUpdateRequest {
    private String nickname;
    private Settings settings;

    @Data
    public static class Settings {
        private Integer defaultHourlyWage; // null 허용
    }
}
