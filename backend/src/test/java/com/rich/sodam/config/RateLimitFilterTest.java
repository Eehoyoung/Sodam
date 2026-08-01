package com.rich.sodam.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

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

    @Test
    void distinctClientIpsCannotGrowBucketMapsBeyondConfiguredBound() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(3);

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/stores");
            request.setRemoteAddr("198.51.100." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, (req, res) ->
                    ((jakarta.servlet.http.HttpServletResponse) res).setStatus(204));
        }

        assertThat(filter.bucketCountForTest()).isLessThanOrEqualTo(3);
    }

    @Test
    void untrustedPeerCannotChooseRateLimitIdentityWithForwardedHeader() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        ReflectionTestUtils.setField(filter, "trustForwardedHeaders", true);
        ReflectionTestUtils.setField(filter, "trustedProxyIps", "10.0.0.10");

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/login");
            request.setRemoteAddr("198.51.100.7");
            request.addHeader("X-Forwarded-For", "203.0.113." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, (req, res) ->
                    ((jakarta.servlet.http.HttpServletResponse) res).setStatus(204));
            assertThat(response.getStatus()).isEqualTo(204);
        }

        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/login");
        blockedRequest.setRemoteAddr("198.51.100.7");
        blockedRequest.addHeader("X-Forwarded-For", "203.0.113.99");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilterInternal(blockedRequest, blockedResponse, (req, res) ->
                ((jakarta.servlet.http.HttpServletResponse) res).setStatus(204));

        assertThat(blockedResponse.getStatus()).isEqualTo(429);
    }

    @Test
    void configuredTrustedProxyUsesForwardedClientAddress() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        ReflectionTestUtils.setField(filter, "trustForwardedHeaders", true);
        ReflectionTestUtils.setField(filter, "trustedProxyIps", "10.0.0.10");

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/login");
            request.setRemoteAddr("10.0.0.10");
            request.addHeader("X-Forwarded-For", "203.0.113.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, (req, res) ->
                    ((jakarta.servlet.http.HttpServletResponse) res).setStatus(204));
        }

        MockHttpServletRequest otherClient = new MockHttpServletRequest("POST", "/api/login");
        otherClient.setRemoteAddr("10.0.0.10");
        otherClient.addHeader("X-Forwarded-For", "203.0.113.2");
        MockHttpServletResponse otherClientResponse = new MockHttpServletResponse();
        filter.doFilterInternal(otherClient, otherClientResponse, (req, res) ->
                ((jakarta.servlet.http.HttpServletResponse) res).setStatus(204));

        assertThat(otherClientResponse.getStatus()).isEqualTo(204);
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
