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

    private LogArgMasker() {
    }

    /**
     * 메서드 인자 배열을 마스킹한 문자열로 변환한다.
     */
    public static String mask(Object[] args) {
        if (args == null) {
            return "null";
        }

        // 연속한 Double 2개 이상이면 위경도쌍으로 간주해 마스킹
        boolean[] maskDoubleByPosition = detectDoublePairs(args);

        return "[" + maskElements(args, maskDoubleByPosition) + "]";
    }

    private static String maskElements(Object[] args, boolean[] maskDoubleByPosition) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < args.length; i++) {
            if (i > 0) {
                sb.append(", ");
            }
            Object arg = args[i];
            if (arg instanceof Double && maskDoubleByPosition[i]) {
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
     * 단일 값 마스킹. 좌표 필드를 가진 DTO는 해당 필드만 가린 표현으로 반환한다.
     */
    private static String maskValue(Object value) {
        if (value == null) {
            return "null";
        }
        if (isSimpleType(value)) {
            return String.valueOf(value);
        }
        return maskDtoCoordinates(value);
    }

    private static boolean isSimpleType(Object value) {
        return value instanceof CharSequence
                || value instanceof Number
                || value instanceof Boolean
                || value instanceof Character
                || value instanceof Enum<?>;
    }

    /**
     * 객체의 선언 필드 중 좌표 필드를 마스킹한 단순 표현을 만든다.
     * 좌표 필드가 없으면 기본 toString 을 사용한다.
     */
    private static String maskDtoCoordinates(Object value) {
        Class<?> type = value.getClass();
        Field[] fields = type.getDeclaredFields();

        boolean hasCoordinate = Arrays.stream(fields)
                .anyMatch(f -> COORDINATE_FIELD_NAMES.contains(f.getName().toLowerCase()));

        if (!hasCoordinate) {
            return String.valueOf(value);
        }

        String body = Arrays.stream(fields)
                .filter(f -> !f.isSynthetic())
                .map(f -> f.getName() + "=" + readMaskedField(value, f))
                .collect(Collectors.joining(", "));
        return type.getSimpleName() + "(" + body + ")";
    }

    private static String readMaskedField(Object owner, Field field) {
        if (COORDINATE_FIELD_NAMES.contains(field.getName().toLowerCase())) {
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
