package com.rich.sodam.dto.response;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StoreEmployeeResponseDtoTest {
    @Test
    void managerViewMasksPhoneAndEmailWithoutChangingName() {
        User user = new User("employee.long@example.com", "홍길동");
        user.setId(3L);
        user.setPhone("01012345678");
        user.setUserGrade(UserGrade.EMPLOYEE);

        StoreEmployeeResponseDto masked = StoreEmployeeResponseDto.from(user).maskedForManager();

        assertThat(masked.getName()).isEqualTo("홍길동");
        assertThat(masked.getPhone()).isEqualTo("010****5678");
        assertThat(masked.getEmail()).isEqualTo("e***@example.com");
    }
}
