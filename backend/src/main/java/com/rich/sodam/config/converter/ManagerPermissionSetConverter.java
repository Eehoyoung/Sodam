package com.rich.sodam.config.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.type.ManagerPermission;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Converter
public class ManagerPermissionSetConverter implements AttributeConverter<Set<ManagerPermission>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(Set<ManagerPermission> permissions) {
        try {
            List<String> ordered = new ArrayList<>();
            if (permissions != null) {
                for (ManagerPermission permission : ManagerPermission.values()) {
                    if (permissions.contains(permission)) ordered.add(permission.name());
                }
            }
            return MAPPER.writeValueAsString(ordered);
        } catch (Exception e) {
            throw new IllegalArgumentException("매니저 권한을 저장할 수 없습니다.", e);
        }
    }

    @Override
    public Set<ManagerPermission> convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) return EnumSet.noneOf(ManagerPermission.class);
        try {
            List<String> names = MAPPER.readValue(json, new TypeReference<>() {});
            EnumSet<ManagerPermission> result = EnumSet.noneOf(ManagerPermission.class);
            for (String name : names) result.add(ManagerPermission.valueOf(name));
            return result;
        } catch (Exception e) {
            throw new IllegalStateException("손상되거나 알 수 없는 매니저 권한 데이터입니다.", e);
        }
    }
}
