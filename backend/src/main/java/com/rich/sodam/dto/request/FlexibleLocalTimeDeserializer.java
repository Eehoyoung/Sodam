package com.rich.sodam.dto.request;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;

import java.io.IOException;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;

public class FlexibleLocalTimeDeserializer extends JsonDeserializer<LocalTime> {

    private static final DateTimeFormatter COLON_TIME_FORMATTER = new DateTimeFormatterBuilder()
            .appendPattern("HH:mm")
            .optionalStart()
            .appendPattern(":ss")
            .optionalEnd()
            .toFormatter();

    @Override
    public LocalTime deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        String value = parser.getValueAsString();
        if (value == null || value.isBlank()) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.contains(":")) {
            try {
                return LocalTime.parse(trimmed, COLON_TIME_FORMATTER);
            } catch (DateTimeParseException e) {
                throw JsonMappingException.from(parser, "\ub2e4\uc2dc\uc785\ub825\ud574 \uc8fc\uc138\uc694");
            }
        }

        if (!trimmed.matches("\\d{4}")) {
            throw JsonMappingException.from(parser, "4\uc790\ub9ac \uc22b\uc790\ub97c \uc801\uc5b4\uc8fc\uc138\uc694");
        }

        int hour = Integer.parseInt(trimmed.substring(0, 2));
        int minute = Integer.parseInt(trimmed.substring(2, 4));
        if (hour > 23 || minute > 59) {
            throw JsonMappingException.from(parser, "\ub2e4\uc2dc\uc785\ub825\ud574 \uc8fc\uc138\uc694");
        }

        return LocalTime.of(hour, minute);
    }
}
