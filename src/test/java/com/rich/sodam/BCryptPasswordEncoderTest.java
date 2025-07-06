package com.rich.sodam;

import com.rich.sodam.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BCryptPasswordEncoder 의존성 주입 테스트
 */
@SpringBootTest
class BCryptPasswordEncoderTest {

    @Autowired
    private UserService userService;

    @Autowired
    private BCryptPasswordEncoder bCryptPasswordEncoder;

    @Test
    void testBCryptPasswordEncoderInjection() {
        // BCryptPasswordEncoder 빈이 정상적으로 주입되었는지 확인
        assertNotNull(bCryptPasswordEncoder, "BCryptPasswordEncoder should be injected");

        // UserService가 정상적으로 주입되었는지 확인
        assertNotNull(userService, "UserService should be injected with BCryptPasswordEncoder dependency");
    }

    @Test
    void testPasswordEncoding() {
        // 패스워드 인코딩이 정상적으로 작동하는지 확인
        String rawPassword = "testPassword123";
        String encodedPassword = bCryptPasswordEncoder.encode(rawPassword);

        assertNotNull(encodedPassword, "Encoded password should not be null");
        assertTrue(bCryptPasswordEncoder.matches(rawPassword, encodedPassword),
                "Raw password should match encoded password");
    }
}
