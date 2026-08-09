package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationPreferenceControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;

    private UserPrincipal principal(long userId) {
        return new UserPrincipal(userId, "notification" + userId + "@example.test",
                List.of(new SimpleGrantedAuthority("ROLE_PERSONAL")));
    }

    @Test
    void unauthenticatedUserCannotReadPreferences() throws Exception {
        mockMvc.perform(get("/api/notifications/prefs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedUserReadsAndUpdatesOnlyOwnPreferences() throws Exception {
        User firstUser = userRepository.save(new User("notification-pref-first@example.test", "첫 사용자"));
        User secondUser = userRepository.save(new User("notification-pref-second@example.test", "둘째 사용자"));

        mockMvc.perform(get("/api/notifications/prefs").with(user(principal(firstUser.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.master").value(true))
                .andExpect(jsonPath("$.marketing").value(false))
                .andExpect(jsonPath("$.quietStart").value("22:00"));

        Map<String, Object> update = Map.of(
                "master", false,
                "attendance", false,
                "payroll", true,
                "billing", false,
                "marketing", true,
                "quietHoursEnabled", true,
                "quietStart", "21:30",
                "quietEnd", "08:15");

        mockMvc.perform(put("/api/notifications/prefs")
                        .with(user(principal(firstUser.getId())))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.master").value(false))
                .andExpect(jsonPath("$.marketing").value(true))
                .andExpect(jsonPath("$.quietEnd").value("08:15"));

        mockMvc.perform(get("/api/notifications/prefs").with(user(principal(firstUser.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.master").value(false))
                .andExpect(jsonPath("$.quietStart").value("21:30"));

        mockMvc.perform(get("/api/notifications/prefs").with(user(principal(secondUser.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.master").value(true))
                .andExpect(jsonPath("$.marketing").value(false));
    }
}
