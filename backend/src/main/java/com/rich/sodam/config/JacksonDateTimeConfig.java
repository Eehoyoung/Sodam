package com.rich.sodam.config;

import com.rich.sodam.dto.request.FlexibleLocalDateDeserializer;
import com.rich.sodam.dto.request.FlexibleLocalDateTimeDeserializer;
import com.rich.sodam.dto.request.FlexibleLocalTimeDeserializer;
import com.rich.sodam.dto.request.KstOffsetLocalDateTimeSerializer;
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
            // 응답 직렬화에만 적용: LocalDateTime(naive, KST 기준 저장값)에 "+09:00" 오프셋을 명시하여
            // 프론트엔드가 기기 타임존과 무관하게 항상 올바른 절대시각으로 파싱하도록 한다.
            // 역직렬화(요청 바디 파싱)는 위 FlexibleLocalDateTimeDeserializer 그대로 유지(비대칭 수정).
            builder.serializerByType(LocalDateTime.class, new KstOffsetLocalDateTimeSerializer());
        };
    }
}
