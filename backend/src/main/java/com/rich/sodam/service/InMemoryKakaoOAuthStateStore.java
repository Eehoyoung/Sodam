package com.rich.sodam.service;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Dev/test-only implementation. Production uses Redis so state is shared across application instances. */
@Service
@Profile({"dev", "test"})
public class InMemoryKakaoOAuthStateStore implements KakaoOAuthStateStore {

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    @Override
    public void save(String state, String verifierDigest, Duration ttl) {
        entries.put(state, new Entry(verifierDigest, Instant.now().plus(ttl)));
    }

    @Override
    public String consume(String state) {
        Entry entry = entries.remove(state);
        if (entry == null || !Instant.now().isBefore(entry.expiresAt())) {
            return null;
        }
        return entry.verifierDigest();
    }

    private record Entry(String verifierDigest, Instant expiresAt) { }
}
