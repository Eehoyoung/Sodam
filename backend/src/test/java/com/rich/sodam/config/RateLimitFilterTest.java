package com.rich.sodam.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    @Test
    void loginRateLimitCannotBeBypassedByVaryingEmailQueryParameters() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();

        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse response = invokeLogin(filter, "attacker" + i + "@example.test");
            assertThat(response.getStatus()).isEqualTo(204);
        }

        MockHttpServletResponse blocked = invokeLogin(filter, "different-address@example.test");

        assertThat(blocked.getStatus()).isEqualTo(429);
    }

    private MockHttpServletResponse invokeLogin(RateLimitFilter filter, String email) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/login");
        request.setRemoteAddr("192.0.2.10");
        request.addParameter("email", email);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, (req, res) ->
                ((jakarta.servlet.http.HttpServletResponse) res).setStatus(204));
        return response;
    }
}
