package com.rich.sodam.service;

import java.time.Duration;

/** One-time server-side store for a Kakao OAuth authorization transaction. */
public interface KakaoOAuthStateStore {

    void save(String state, String verifierDigest, Duration ttl);

    /** Atomically consumes a transaction and returns its verifier digest, or null when absent/expired. */
    String consume(String state);
}
