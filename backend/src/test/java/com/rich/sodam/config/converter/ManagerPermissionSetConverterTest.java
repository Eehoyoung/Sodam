package com.rich.sodam.config.converter;

import com.rich.sodam.domain.type.ManagerPermission;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ManagerPermissionSetConverterTest {
    private final ManagerPermissionSetConverter converter = new ManagerPermissionSetConverter();

    @Test
    void serializesInEnumDeclarationOrderAndRoundTrips() {
        String json = converter.convertToDatabaseColumn(EnumSet.of(
                ManagerPermission.DASHBOARD_VIEW,
                ManagerPermission.ATTENDANCE_APPROVE,
                ManagerPermission.STAFF_VIEW));

        assertThat(json).isEqualTo("[\"ATTENDANCE_APPROVE\",\"STAFF_VIEW\",\"DASHBOARD_VIEW\"]");
        assertThat(converter.convertToEntityAttribute(json)).containsExactly(
                ManagerPermission.ATTENDANCE_APPROVE,
                ManagerPermission.STAFF_VIEW,
                ManagerPermission.DASHBOARD_VIEW);
    }

    @Test
    void unknownOrCorruptValuesFailClosed() {
        assertThatThrownBy(() -> converter.convertToEntityAttribute("[\"ROOT_ACCESS\"]"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> converter.convertToEntityAttribute("{broken"))
                .isInstanceOf(IllegalStateException.class);
    }
}
