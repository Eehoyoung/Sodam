package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

/**
 * 회원가입 후 프로필 기본정보 보강 요청.
 *
 * 회원가입은 email/password/name 만 받아 빠르게 통과시키고,
 * 첫 로그인 직후 본 화면에서 전화번호(필수) + 이름 확정 + 생년월일(선택) 을 수집한다.
 * profile_completed_at 마킹 전까지 FE 는 다른 화면 진입 차단.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ProfileBasicsUpdateDto {

    /**
     * 휴대폰 번호 — 010-XXXX-XXXX 또는 숫자만 11자리.
     * SMS 알림 + 고객지원 식별에 사용.
     */
    @NotBlank(message = "휴대폰 번호는 필수입니다.")
    @Pattern(regexp = "^(01[016789])[- ]?\\d{3,4}[- ]?\\d{4}$",
            message = "휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)")
    private String phone;

    /**
     * 이름 — null/blank 이면 가입 시 이름 유지, 값 있으면 갱신.
     */
    @Size(min = 2, max = 50, message = "이름은 2~50자 사이여야 합니다.")
    private String name;

    /**
     * 생년월일 (선택, ISO 형식 YYYY-MM-DD).
     */
    private LocalDate birthDate;
}
