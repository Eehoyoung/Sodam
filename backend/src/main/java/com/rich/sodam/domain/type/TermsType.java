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
    MARKETING(false),
    /**
     * 개인 모드 전환 동의 (선택 — 켤 때만 수집).
     *
     * <p>매장 소속 없이 본인이 근무지·근무기록을 직접 남기는 기능을 켤 때 받는다. 가입 시 받은
     * "계약 이행" 범위를 벗어난 신규 수집(닉네임·기본시급·자기신고 근무지)이라 별도 동의가 필요하다.</p>
     *
     * <p>⛔ 동의 화면 <b>문구</b>는 법무·노무 검토 결과를 반영해야 한다 — 임금·퇴직금 청구권에 영향이
     * 없다는 점, 근로관계 종료와 무관하다는 점, 회원탈퇴가 아니라는 점이 필수 고지 항목이다
     * (2026-08-07 3자 교차검증). 본 enum 은 다른 약관과 동일하게 메타데이터만 정의한다.</p>
     */
    PERSONAL_MODE_CONVERSION(false);

    private final boolean required;

    TermsType(boolean required) {
        this.required = required;
    }

    public boolean isRequired() {
        return required;
    }
}
