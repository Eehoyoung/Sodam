package com.rich.sodam.config.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

/**
 * 요일별 근무 스케줄 ↔ 단일 JSON 컬럼(labor_contract.work_schedule_json) 변환기.
 *
 * <p>요일×시각 4종 = 최대 28컬럼 대신 단일 JSON 배열로 보관한다(V38).
 * 직렬 형식: {@code [{"day":"MONDAY","startTime":"17:00","endTime":"22:00",
 * "breakStartTime":null,"breakEndTime":null}, ...]} — LocalTime 은 ISO "HH:mm".
 * 구조·업무규칙 검증은 저장 경로의 {@code WorkScheduleCalculator} 가 수행하고,
 * 여기는 순수 직렬화만 담당한다.</p>
 */
@Converter
public class WorkScheduleListConverter implements AttributeConverter<List<WorkScheduleDay>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS); // LocalTime → "17:00" (배열 아님)

    private static final TypeReference<List<WorkScheduleDay>> LIST_TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<WorkScheduleDay> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            throw new IllegalArgumentException("근무 스케줄을 저장 형식으로 변환하지 못했습니다.", e);
        }
    }

    @Override
    public List<WorkScheduleDay> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            return MAPPER.readValue(dbData, LIST_TYPE);
        } catch (Exception e) {
            // 손상 데이터를 조용히 null 처리하면 월급이 직접 입력 모드로 오인된다 — 명시적 실패
            throw new IllegalStateException("근무 스케줄 저장 데이터가 손상되었습니다: " + dbData, e);
        }
    }
}
