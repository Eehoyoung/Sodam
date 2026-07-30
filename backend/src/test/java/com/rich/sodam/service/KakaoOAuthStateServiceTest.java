package com.rich.sodam.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KakaoOAuthStateServiceTest {

    @Test
    void acceptsOnlyTheMatchingVerifierAndOnlyOnce() {
        KakaoOAuthStateService service = new KakaoOAuthStateService(new InMemoryKakaoOAuthStateStore());
        KakaoOAuthStateService.Authorization transaction = service.begin();

        assertThat(service.consume(transaction.state(), transaction.codeVerifier())).isTrue();
        assertThat(service.consume(transaction.state(), transaction.codeVerifier())).isFalse();
    }

    @Test
    void rejectsAnAuthorizationStateWithAnotherTransactionVerifier() {
        KakaoOAuthStateService service = new KakaoOAuthStateService(new InMemoryKakaoOAuthStateStore());
        KakaoOAuthStateService.Authorization first = service.begin();
        KakaoOAuthStateService.Authorization second = service.begin();

        assertThat(service.consume(first.state(), second.codeVerifier())).isFalse();
    }
}
