package com.rich.sodam.domain.type;

/**
 * 동의 대상 약관 종류. 필수/선택 구분을 보유한다(PIPA §22 — 필수·선택 동의 분리).
 *
 * <p>약관의 <b>본문(법률 문구)</b>은 본 코드가 다루지 않는다(변호사 검토·승인 필요).
 * 여기서는 동의 수집·이력·버전관리에 필요한 메타데이터만 정의한다.</p>
 */
public enum TermsType {

    /** 서비스 이용약관 (필수). */
    TERMS_OF_SERVICE(true),
    /** 개인정보 수집·이용 동의 / 처리방침 (필수). */
    PRIVACY_POLICY(true),
    /** 만 14세 이상 확인 (필수). */
    AGE_14(true),
    /** 위치정보 수집·이용 동의 (GPS 출퇴근 사용 시 필수 — 위치정보법 §18·§19). */
    LOCATION_INFO(true),
    /** 마케팅 정보 수신 동의 (선택). */
    MARKETING(false);

    private final boolean required;

    TermsType(boolean required) {
        this.required = required;
    }

    public boolean isRequired() {
        return required;
    }
}
