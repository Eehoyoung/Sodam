package com.rich.sodam.security.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.util.HashMap;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebSocketOriginHandshakeInterceptorTest {

    private final WebSocketOriginHandshakeInterceptor interceptor =
            new WebSocketOriginHandshakeInterceptor(Set.of("https://owner.sodam.test"));

    @Test
    void rejectsAWebSocketHandshakeFromAnUntrustedBrowserOrigin() {
        ServerHttpRequest request = requestWithOrigin("https://untrusted.sodam.test");

        assertThat(interceptor.beforeHandshake(request, mock(ServerHttpResponse.class),
                mock(WebSocketHandler.class), new HashMap<>())).isFalse();
    }

    @Test
    void acceptsTheConfiguredWebConsoleOrigin() {
        ServerHttpRequest request = requestWithOrigin("https://owner.sodam.test");

        assertThat(interceptor.beforeHandshake(request, mock(ServerHttpResponse.class),
                mock(WebSocketHandler.class), new HashMap<>())).isTrue();
    }

    @Test
    void preservesOriginlessNativeClientHandshakeForJwtAuthenticationAtConnect() {
        ServerHttpRequest request = requestWithOrigin(null);

        assertThat(interceptor.beforeHandshake(request, mock(ServerHttpResponse.class),
                mock(WebSocketHandler.class), new HashMap<>())).isTrue();
    }

    private ServerHttpRequest requestWithOrigin(String origin) {
        ServerHttpRequest request = mock(ServerHttpRequest.class);
        HttpHeaders headers = new HttpHeaders();
        if (origin != null) {
            headers.set(HttpHeaders.ORIGIN, origin);
        }
        when(request.getHeaders()).thenReturn(headers);
        return request;
    }
}
