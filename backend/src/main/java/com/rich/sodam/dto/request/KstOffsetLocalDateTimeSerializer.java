package com.rich.sodam.dto.request;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * LocalDateTime 응답 직렬화 전용 시리얼라이저.
 * <p>
 * DB에는 오프셋 없는 한국시간(KST) 기준의 naive LocalDateTime 값이 저장되어 있다.
 * 이 값을 그대로 JSON으로 내려보내면(Jackson 기본 동작) 오프셋이 없는 문자열이 되어,
 * 프론트엔드(JS Date 파싱)가 기기의 로컬 타임존으로 해석해버리는 문제가 있다.
 * 이 서비스는 100% 한국 국내 서비스이므로, 응답 시에는 항상 "+09:00" 오프셋을 명시적으로
 * 붙여서 내려줌으로써 클라이언트가 기기 타임존과 무관하게 항상 올바른 절대시각을 얻도록 한다.
 * <p>
 * 주의: 이 시리얼라이저는 응답(서버 -> 클라이언트) 직렬화에만 적용된다.
 * 요청 바디 역직렬화({@link FlexibleLocalDateTimeDeserializer})는 건드리지 않는다 —
 * 기존 프론트엔드는 오프셋 없는 naive 문자열로 요청을 보내고 있기 때문이다.
 */
public class KstOffsetLocalDateTimeSerializer extends JsonSerializer<LocalDateTime> {

    private static final ZoneOffset KST = ZoneOffset.of("+09:00");
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    @Override
    public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
            return;
        }
        gen.writeString(value.atOffset(KST).format(FORMATTER));
    }
}
