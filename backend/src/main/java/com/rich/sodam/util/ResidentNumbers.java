package com.rich.sodam.util;

/**
 * 주민등록번호 마스킹 유틸.
 *
 * <p>⚠️ 소담은 주민번호를 <b>저장·로그하지 않는다</b>(개인정보보호법·CLAUDE.md Hard-No, 확정안 C-2).
 * 4대보험 신고서 생성 시 요청에 담겨 들어와 사장에게 그대로 반환될 뿐이며, 어떤 영속 계층·로그에도
 * 남기지 않는다. 감사/표시용으로는 반드시 이 마스킹 결과만 사용한다.</p>
 */
public final class ResidentNumbers {

    private ResidentNumbers() {
    }

    /** "900101-1234567" → "900101-1******". 형식이 달라도 뒤 6자리를 가린다. */
    public static String mask(String residentNumber) {
        if (residentNumber == null || residentNumber.isBlank()) {
            return "";
        }
        String digits = residentNumber.replace("-", "");
        if (digits.length() < 7) {
            return "******";
        }
        String front = digits.substring(0, 6);
        String genderDigit = digits.substring(6, 7);
        return front + "-" + genderDigit + "******";
    }
}
