package com.rich.sodam.dto.response;

/**
 * 연소근로자(만 18세 미만) 가드 결과 (L-NEW-01). 사장 전용.
 *
 * <p>직원의 생년월일로 미성년 여부·만 나이·근로 제약을 안내한다. 청소년 알바 고용 시
 * 야간·과한 근로는 형사처벌 영역이므로 사장이 미리 확인하도록 돕는다.
 *
 * <p><b>친권자 동의서·가족관계증명서 원본은 저장하지 않는다</b>(PII Hard No, 프로젝트 운영 기준 §절대금지).
 * 필요 여부 플래그({@code consentRequired})와 안내 문구까지만 제공한다.
 *
 * @param employeeId          직원 ID
 * @param minor               만 18세 미만 여부(생년월일 없으면 false)
 * @param age                 만 나이(생년월일 없으면 null = 확인 불가)
 * @param dailyHourLimit      연소자 1일 근로시간 한도(§69)
 * @param weeklyHourLimit     연소자 1주 근로시간 한도(§69)
 * @param nightWorkRestricted 야간(22:00~06:00)·휴일근로 제한 여부(미성년이면 true)
 * @param consentRequired     친권자 동의서·가족관계증명서 비치 필요 여부(§66, 미성년이면 true)
 * @param guidance            사장 대상 안내 문구
 * @param disclaimer          면책
 */
public record MinorGuardResponse(
        Long employeeId,
        boolean minor,
        Integer age,
        int dailyHourLimit,
        int weeklyHourLimit,
        boolean nightWorkRestricted,
        boolean consentRequired,
        boolean electronicConsentAvailable,
        String evidenceStoragePolicy,
        String guidance,
        String disclaimer
) {
}
