package com.rich.sodam.config.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rich.sodam.domain.JobAvailabilityDay;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

/**
 * 요일별 근무 가능 시간 ↔ 단일 JSON 컬럼(job_seeking_profile.availability_json) 변환기.
 *
 * <p>{@link com.rich.sodam.config.converter.WorkScheduleListConverter}(V41) 패턴을 그대로 복제한 것
 * — 요일×시각 다중 컬럼 대신 단일 JSON 배열로 보관한다(V53, 260711_작업통합.md Part 2 §3.1).
 * 직렬 형식: {@code [{"day":"MONDAY","startTime":"10:00","endTime":"18:00"}, ...]} — LocalTime 은
 * ISO "HH:mm". 구조·업무규칙 검증(요일 중복·야간 불허 등)은 저장 경로의 서비스 레이어가 수행하고,
 * 여기는 순수 직렬화만 담당한다.</p>
 */
@Converter
public class JobAvailabilityListConverter implements AttributeConverter<List<JobAvailabilityDay>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS); // LocalTime → "10:00" (배열 아님)

    private static final TypeReference<List<JobAvailabilityDay>> LIST_TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<JobAvailabilityDay> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            throw new IllegalArgumentException("근무 가능 시간을 저장 형식으로 변환하지 못했습니다.", e);
        }
    }

    @Override
    public List<JobAvailabilityDay> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            return MAPPER.readValue(dbData, LIST_TYPE);
        } catch (Exception e) {
            // 손상 데이터를 조용히 null 처리하면 "근무가능 정보 미기재"로 오인되어 구직 자격이 잘못 판정된다
            throw new IllegalStateException("근무 가능 시간 저장 데이터가 손상되었습니다: " + dbData, e);
        }
    }
}
