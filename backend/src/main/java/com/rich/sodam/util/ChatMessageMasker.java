package com.rich.sodam.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 채팅 메시지 PII 자동 마스킹(recruitment-monetization-gamification-plan.md §4.3).
 *
 * <p>전화번호·계좌번호로 추정되는 패턴을 감지해 저장 <b>전에</b> 마스킹한다 — 원문은 어디에도
 * 남기지 않는다(security.md PII 최소화 원칙, {@link com.rich.sodam.domain.ChatMessage} javadoc 참고).
 * 오탐(false positive)이 어느 정도 있는 건 허용하되(§4.3), "12,000원" 같은 콤마 구분 금액이나
 * "10월 3일" 같은 한글 날짜 표기는 절대 걸리지 않도록 구분자 문자 집합을 숫자·하이픈·점·공백으로
 * 한정한다(콤마·한글 문자는 구분자로 인정하지 않음).</p>
 *
 * <p>순수 함수 유틸(스프링 빈 아님) — 단위 테스트가 DI 없이 직접 호출할 수 있도록 static 메서드로
 * 노출한다.</p>
 */
public final class ChatMessageMasker {

    /**
     * 국내 전화번호(휴대폰 01X, 유선 02/0XX) — {@code (?<!\d)}/{@code (?!\d)} 로 앞뒤가 숫자가 아닐 때만
     * 매치해, 더 긴 숫자열의 일부를 잘라 오매칭하지 않도록 한다. 구분자는 하이픈·마침표·공백 또는
     * 없음(붙여쓰기)만 인정한다 — 콤마·한글은 구분자가 아니므로 "12,000원"·"10월 3일"은 매치되지 않는다.
     */
    private static final Pattern PHONE = Pattern.compile(
            "(?<!\\d)(01[016789]|0(?:2|[3-6]\\d))[-.\\s]?(\\d{3,4})[-.\\s]?(\\d{4})(?!\\d)");

    /** 계좌번호로 흔히 쓰이는 하이픈 구분 3~4그룹 숫자열(예: 110-1234-567890). */
    private static final Pattern ACCOUNT_DASHED = Pattern.compile(
            "(?<!\\d)(?:\\d{2,6}[-.]){2,3}\\d{2,6}(?!\\d)");

    /** 구분자 없이 붙여 쓴 10~16자리 숫자열(계좌번호 후보). 전화번호 매치 이후에 적용해 겹치지 않게 한다. */
    private static final Pattern ACCOUNT_PLAIN = Pattern.compile("(?<!\\d)\\d{10,16}(?!\\d)");

    private static final String PHONE_MASK_MIDDLE = "****";
    private static final String ACCOUNT_MASK = "[계좌번호로 추정되는 정보가 가려졌어요]";

    private ChatMessageMasker() {
    }

    /**
     * 메시지 원문을 마스킹한다. 원문은 반환값에 포함되지 않는다(호출측도 원문을 보관하지 않아야 한다).
     *
     * @param rawContent 사용자가 입력한 원문
     * @return 마스킹된 내용과, 실제로 마스킹이 적용됐는지 여부
     */
    public static MaskResult mask(String rawContent) {
        if (rawContent == null) {
            return new MaskResult("", false);
        }
        String afterPhone = maskPhones(rawContent);
        boolean phoneMasked = !afterPhone.equals(rawContent);

        String afterAccountDashed = maskWith(afterPhone, ACCOUNT_DASHED, ACCOUNT_MASK);
        String afterAccountPlain = maskWith(afterAccountDashed, ACCOUNT_PLAIN, ACCOUNT_MASK);
        boolean accountMasked = !afterAccountPlain.equals(afterPhone);

        return new MaskResult(afterAccountPlain, phoneMasked || accountMasked);
    }

    private static String maskPhones(String content) {
        Matcher matcher = PHONE.matcher(content);
        StringBuilder result = new StringBuilder();
        int lastEnd = 0;
        while (matcher.find()) {
            result.append(content, lastEnd, matcher.start());
            String prefix = matcher.group(1);
            result.append(prefix).append('-').append(PHONE_MASK_MIDDLE).append('-').append(PHONE_MASK_MIDDLE);
            lastEnd = matcher.end();
        }
        result.append(content, lastEnd, content.length());
        return result.toString();
    }

    private static String maskWith(String content, Pattern pattern, String replacement) {
        return pattern.matcher(content).replaceAll(Matcher.quoteReplacement(replacement));
    }

    /**
     * @param content 마스킹 적용 후 최종 저장할 내용
     * @param masked  전화번호/계좌번호 패턴이 감지되어 실제로 마스킹됐는지(FE 안내 배지 트리거)
     */
    public record MaskResult(String content, boolean masked) {
    }
}
