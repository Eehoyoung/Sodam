package com.rich.sodam.config;

import com.rich.sodam.dto.request.FlexibleLocalDateDeserializer;
import com.rich.sodam.dto.request.FlexibleLocalDateTimeDeserializer;
import com.rich.sodam.dto.request.FlexibleLocalTimeDeserializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Configuration
public class JacksonDateTimeConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer compactDateTimeInputCustomizer() {
        return builder -> {
            builder.deserializerByType(LocalDate.class, new FlexibleLocalDateDeserializer());
            builder.deserializerByType(LocalTime.class, new FlexibleLocalTimeDeserializer());
            builder.deserializerByType(LocalDateTime.class, new FlexibleLocalDateTimeDeserializer());
        };
    }
}
