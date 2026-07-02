package com.rich.sodam.dto.request;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    private static final DateTimeFormatter COMPACT_MINUTE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMddHHmm");
    private static final DateTimeFormatter COMPACT_SECOND_FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    @Override
    public LocalDateTime deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        String value = parser.getValueAsString();
        if (value == null || value.isBlank()) {
            return null;
        }

        String trimmed = value.trim();
        String compact = trimmed.replace("T", "").replace(" ", "").replace("-", "").replace(":", "");
        try {
            if (compact.matches("\\d{12}")) {
                return LocalDateTime.parse(compact, COMPACT_MINUTE_FORMATTER);
            }
            if (compact.matches("\\d{14}")) {
                return LocalDateTime.parse(compact, COMPACT_SECOND_FORMATTER);
            }
            return LocalDateTime.parse(trimmed, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            throw JsonMappingException.from(parser, "날짜와 시간은 숫자로 입력해 주세요. 예: 202606291020");
        }
    }
}
