package com.rich.sodam.integration;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthEmailCheckRequestResponseTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("GET /api/auth/email-check returns true for unused email without authentication")
    void emailCheck_unusedEmail_available() throws Exception {
        mockMvc.perform(get("/api/auth/email-check")
                        .param("email", "unused-email-check@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true));
    }

    @Test
    @DisplayName("GET /api/auth/email-check returns false for existing email without authentication")
    void emailCheck_existingEmail_unavailable() throws Exception {
        User user = new User("existing-email-check@example.com", "Existing User");
        user.setUserGrade(UserGrade.Personal);
        userRepository.save(user);

        mockMvc.perform(get("/api/auth/email-check")
                        .param("email", "existing-email-check@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false));
    }
}
