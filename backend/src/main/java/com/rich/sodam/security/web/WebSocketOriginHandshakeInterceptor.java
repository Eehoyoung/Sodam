package com.rich.sodam.security.web;

import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Set;

/**
 * Restricts browser WebSocket handshakes to the same allowlist as the web-session CSRF boundary.
 * Native mobile clients do not normally send Origin and continue to authenticate at STOMP CONNECT.
 */
public class WebSocketOriginHandshakeInterceptor implements HandshakeInterceptor {

    private final Set<String> allowedOrigins;

    public WebSocketOriginHandshakeInterceptor(Set<String> allowedOrigins) {
        this.allowedOrigins = Set.copyOf(allowedOrigins);
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, java.util.Map<String, Object> attributes) {
        String origin = request.getHeaders().getFirst(HttpHeaders.ORIGIN);
        if (origin == null || origin.isBlank()) {
            return true;
        }
        String normalized = normalizeOrigin(origin);
        return normalized != null && allowedOrigins.contains(normalized);
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }

    private static String normalizeOrigin(String origin) {
        try {
            URI uri = URI.create(origin);
        if (uri.getScheme() == null || uri.getAuthority() == null
                || (uri.getPath() != null && !uri.getPath().isEmpty())
                || uri.getQuery() != null || uri.getFragment() != null) {
                return null;
            }
            return uri.getScheme() + "://" + uri.getAuthority();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
