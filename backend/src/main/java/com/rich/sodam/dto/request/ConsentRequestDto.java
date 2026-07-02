package com.rich.sodam.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 동의 수집 요청 (필수/선택 분리 — PIPA §22). 카카오 등 소셜 가입 후 동의 보강, 또는 위치정보 동의에 사용.
 * null = 동의하지 않음. 필수 항목 미동의 시 거부된다.
 */
@Getter
@Setter
@NoArgsConstructor
public class ConsentRequestDto {

    /** 이용약관 동의 (필수) */
    private Boolean termsAgreed;

    /** 개인정보 수집·이용 동의 (필수) */
    private Boolean privacyAgreed;

    /** 만 14세 이상 확인 (필수) */
    private Boolean ageConfirmed;

    /** 위치정보 수집·이용 동의 (GPS 출퇴근 사용 시 필수) */
    private Boolean locationInfoAgreed;

    /** 마케팅 정보 수신 동의 (선택) */
    private Boolean marketingAgreed;
}
