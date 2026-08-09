package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.StoreQrToken;
import com.rich.sodam.repository.StoreQrTokenRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-C — QR 출퇴근 토큰 검증.
 *
 * <p>이 테스트가 지키는 것은 <b>대리출근 차단</b>이다. 정적 QR 은 사진 한 장으로 뚫리므로
 * 매장 일치·만료·회전 세 가지가 실제로 강제되는지 고정한다. 여기가 약해지면 NFC 스텁 시절
 * (출시 차단 P0)로 회귀한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreQrTokenServiceTest {

    private static final AtomicInteger SEQ = new AtomicInteger(0);

    @Autowired private StoreQrTokenService service;
    @Autowired private StoreQrTokenRepository qrTokenRepository;
    @Autowired private StoreRepository storeRepository;

    private Store createStore() {
        int n = SEQ.incrementAndGet();
        return storeRepository.save(
                new Store("QR매장" + n, String.format("%010d", 4_000_000_000L + n), "02-000-0000", "카페", 12_000, 100));
    }

    @Test
    @DisplayName("발급된 QR 토큰으로 검증을 통과한다")
    void validTokenPasses() {
        Store store = createStore();
        StoreQrToken token = service.currentOrIssue(store.getId());

        assertThatCode(() -> service.verify(store.getId(), token.getToken()))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("다른 매장의 QR 로는 출퇴근할 수 없다 — BOLA 차단")
    void tokenFromAnotherStoreIsRejected() {
        Store mine = createStore();
        Store other = createStore();
        StoreQrToken otherToken = service.currentOrIssue(other.getId());

        assertThatThrownBy(() -> service.verify(mine.getId(), otherToken.getToken()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("재발급하면 이전 QR 은 즉시 무효가 된다 — 유출 대응")
    void rotationInvalidatesPreviousToken() {
        Store store = createStore();
        StoreQrToken first = service.currentOrIssue(store.getId());

        StoreQrToken second = service.rotate(store.getId(), StoreQrToken.DEFAULT_VALIDITY);

        assertThat(second.getToken()).isNotEqualTo(first.getToken());
        assertThatThrownBy(() -> service.verify(store.getId(), first.getToken()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatCode(() -> service.verify(store.getId(), second.getToken()))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("만료된 QR 은 거부된다 — 유출된 사진의 수명을 제한한다")
    void expiredTokenIsRejected() throws Exception {
        Store store = createStore();
        StoreQrToken token = service.rotate(store.getId(), Duration.ofDays(1));

        Field f = StoreQrToken.class.getDeclaredField("expiresAt");
        f.setAccessible(true);
        f.set(token, LocalDateTime.now().minusMinutes(1));
        qrTokenRepository.saveAndFlush(token);

        assertThatThrownBy(() -> service.verify(store.getId(), token.getToken()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("임의 문자열·빈 값으로는 통과할 수 없다")
    void unknownOrBlankTokenIsRejected() {
        Store store = createStore();
        service.currentOrIssue(store.getId());

        assertThatThrownBy(() -> service.verify(store.getId(), "made-up-token"))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.verify(store.getId(), "  "))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.verify(store.getId(), null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("토큰은 매번 다른 난수로 발급된다 — 추측 불가")
    void tokensAreUnpredictable() {
        Store store = createStore();

        String a = service.rotate(store.getId(), StoreQrToken.DEFAULT_VALIDITY).getToken();
        String b = service.rotate(store.getId(), StoreQrToken.DEFAULT_VALIDITY).getToken();

        assertThat(a).isNotEqualTo(b);
        assertThat(a).hasSizeGreaterThanOrEqualTo(30);
    }

    @Test
    @DisplayName("유효한 토큰이 있으면 조회 시 재발급하지 않고 같은 것을 돌려준다")
    void currentReusesValidToken() {
        Store store = createStore();
        StoreQrToken first = service.currentOrIssue(store.getId());

        StoreQrToken again = service.currentOrIssue(store.getId());

        assertThat(again.getToken()).isEqualTo(first.getToken());
    }
}
