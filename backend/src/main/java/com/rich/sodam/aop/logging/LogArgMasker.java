package com.rich.sodam.aop.logging;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 서비스 로깅 시 위치정보(위경도) 등 민감 좌표를 마스킹하기 위한 유틸.
 * <p>
 * 위치정보보호법상 위경도는 개인 위치정보로 취급되므로 평문 로깅을 금지한다.
 * 파라미터명을 신뢰할 수 없는 런타임 환경을 고려해 다음 두 가지 방어 전략을 쓴다.
 * <ol>
 *     <li>좌표 필드(latitude/longitude 등)를 가진 DTO 객체는 해당 필드를 {@code [MASKED]} 로 치환</li>
 *     <li>Double 인자가 2개 이상 연속으로 들어오면(전형적 위경도쌍) 모두 마스킹</li>
 * </ol>
 * 좌표/PII 외의 값은 그대로 두어 디버깅 정보를 보존한다.
 */
public final class LogArgMasker {

    static final String MASKED = "[MASKED]";

    /**
     * 좌표를 담은 필드명(소문자 비교). 약어/축약형 포함.
     */
    private static final Set<String> COORDINATE_FIELD_NAMES = Set.of(
            "latitude", "longitude", "lat", "lng", "lon"
    );

    /**
     * 민감 PII/크리덴셜 필드명(소문자, '_' 제거 비교). 평문 로깅 금지(PIPA §29).
     * password(BCrypt 전 평문)·주민번호·계좌·전화·생년월일·카드·토큰 등.
     */
    private static final Set<String> SENSITIVE_FIELD_NAMES = Set.of(
            "password", "passwd", "pwd",
            "residentnumber", "resident", "rrn", "ssn", "주민번호",
            "account", "accountnumber", "bankaccount", "계좌",
            "phone", "phonenumber", "mobile",
            "birthdate", "birth", "생년월일",
            "card", "cardnumber", "cvc",
            "token", "accesstoken", "refreshtoken", "jwt", "secret", "apikey",
            "email"
    );

    private LogArgMasker() {
    }

    /**
     * 메서드 인자 배열을 마스킹한 문자열로 변환한다.
     */
    public static String mask(Object[] args) {
        return mask(args, null);
    }

    /**
     * 파라미터명을 함께 받아, 민감 파라미터(password/email 등 raw String 포함)를
     * 타입 무관하게 마스킹한다. paramNames 가 null 이면 DTO 필드/좌표쌍 기반만 적용.
     */
    public static String mask(Object[] args, String[] paramNames) {
        if (args == null) {
            return "null";
        }
        boolean[] maskDoubleByPosition = detectDoublePairs(args);
        return "[" + maskElements(args, maskDoubleByPosition, paramNames) + "]";
    }

    private static String maskElements(Object[] args, boolean[] maskDoubleByPosition, String[] paramNames) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < args.length; i++) {
            if (i > 0) {
                sb.append(", ");
            }
            Object arg = args[i];
            // 파라미터명이 민감하면 타입 무관 마스킹 (raw String password/email 등)
            if (paramNames != null && i < paramNames.length && isMaskedFieldName(paramNames[i])) {
                sb.append(MASKED);
            } else if (arg instanceof Double && maskDoubleByPosition[i]) {
                sb.append(MASKED);
            } else {
                sb.append(maskValue(arg));
            }
        }
        return sb.toString();
    }

    private static boolean[] detectDoublePairs(Object[] args) {
        boolean[] mask = new boolean[args.length];
        int i = 0;
        while (i < args.length) {
            if (args[i] instanceof Double) {
                int run = 0;
                int j = i;
                while (j < args.length && args[j] instanceof Double) {
                    run++;
                    j++;
                }
                if (run >= 2) {
                    for (int k = i; k < j; k++) {
                        mask[k] = true;
                    }
                }
                i = j;
            } else {
                i++;
            }
        }
        return mask;
    }

    /**
     * 단일 객체(예: 메서드 반환값) 마스킹. DTO 의 좌표·민감 필드를 가린 표현 반환.
     */
    public static String maskOne(Object value) {
        return maskValue(value);
    }

    /**
     * 단일 값 마스킹. 좌표/민감 필드를 가진 DTO는 해당 필드만 가린 표현으로 반환한다.
     */
    private static String maskValue(Object value) {
        if (value == null) {
            return "null";
        }
        if (isSimpleType(value)) {
            return String.valueOf(value);
        }
        return maskDtoSensitive(value);
    }

    private static boolean isSimpleType(Object value) {
        return value instanceof CharSequence
                || value instanceof Number
                || value instanceof Boolean
                || value instanceof Character
                || value instanceof Enum<?>;
    }

    /**
     * 객체의 선언 필드 중 좌표·민감 필드를 마스킹한 단순 표현을 만든다.
     * 좌표/민감 필드가 하나도 없으면 기본 toString 을 사용한다(디버깅 정보 보존).
     */
    private static String maskDtoSensitive(Object value) {
        Class<?> type = value.getClass();
        Field[] fields = type.getDeclaredFields();

        boolean needsMask = Arrays.stream(fields)
                .anyMatch(f -> isMaskedFieldName(f.getName()));

        if (!needsMask) {
            return String.valueOf(value);
        }

        String body = Arrays.stream(fields)
                .filter(f -> !f.isSynthetic())
                .map(f -> f.getName() + "=" + readMaskedField(value, f))
                .collect(Collectors.joining(", "));
        return type.getSimpleName() + "(" + body + ")";
    }

    /** 필드명이 좌표 또는 민감 필드인지(소문자·'_' 제거 비교). */
    private static boolean isMaskedFieldName(String name) {
        String n = name.toLowerCase().replace("_", "");
        return COORDINATE_FIELD_NAMES.contains(n) || SENSITIVE_FIELD_NAMES.contains(n);
    }

    private static String readMaskedField(Object owner, Field field) {
        if (isMaskedFieldName(field.getName())) {
            return MASKED;
        }
        try {
            field.setAccessible(true);
            return String.valueOf(field.get(owner));
        } catch (Exception e) {
            // 리플렉션 실패 시 방어적으로 마스킹 (정보 노출 방지)
            return MASKED;
        }
    }
}
