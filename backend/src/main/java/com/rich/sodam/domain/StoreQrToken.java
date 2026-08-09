package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * 매장 QR 출퇴근 토큰 (260807 마스터 실행계획서 WP-C).
 *
 * <h3>왜 QR 인가</h3>
 * <p>iOS 1차 출시에서 NFC 가 빠져 GPS 만 남았는데, GPS 는 실내·건물 밀집 지역에서 오차가 크다.
 * QR 은 두 플랫폼 모두 되고 매장 비용이 종이 한 장이다. 출퇴근은 코어 습관 지표라 여기가 흔들리면
 * 나머지가 전부 흔들린다.</p>
 *
 * <h3>대리출근 방지 — 정적 QR 은 사진 한 장으로 뚫린다</h3>
 * <p>매장에 붙여둔 QR 을 찍어 단톡방에 올리면 집에서도 출근이 찍힌다. NFC 태그 검증이
 * (storeId, tagId) DB 대조로 대리출근을 막았던 것과 같은 강도가 필요하므로, 이 토큰은
 * <b>주기적으로 회전</b>하고 검증 시 <b>서버 시각 창</b>을 함께 본다:</p>
 * <ul>
 *   <li>{@code token} 은 발급 시 난수로 만들고, 사장이 재발급하면 이전 토큰은 즉시 무효가 된다
 *       (매장당 활성 토큰 1개).</li>
 *   <li>{@code expiresAt} 이 지난 토큰은 거부한다 — 유출된 QR 사진의 수명을 제한한다.</li>
 *   <li>매장 화면에 QR 을 띄워 쓰는 경우 짧은 주기로 회전시키면 사진 유출이 사실상 무력화된다.</li>
 * </ul>
 *
 * <p>⚠️ 이 회전·만료 설계를 약화시키면 NFC 스텁 시절(출시 차단 P0)로 회귀한다.</p>
 */
@Entity
@Table(name = "store_qr_token", indexes = {
        @Index(name = "idx_store_qr_token_store", columnList = "store_id"),
        @Index(name = "uq_store_qr_token_value", columnList = "token", unique = true)
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StoreQrToken {

    /** 토큰 기본 유효기간 — 종이 QR 운영을 고려한 값. 화면 게시형은 더 짧게 재발급하면 된다. */
    public static final Duration DEFAULT_VALIDITY = Duration.ofDays(7);

    private static final SecureRandom RANDOM = new SecureRandom();

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "store_qr_token_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** QR 에 인코딩되는 난수 토큰. 추측 불가해야 하므로 SecureRandom 으로 만든다. */
    @Column(name = "token", nullable = false, length = 64)
    private String token;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** 재발급 시 이전 토큰을 즉시 무효화한다(매장당 활성 토큰 1개). */
    @Column(name = "active", nullable = false)
    private boolean active;

    private StoreQrToken(Store store, String token, LocalDateTime issuedAt, LocalDateTime expiresAt) {
        this.store = store;
        this.token = token;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.active = true;
    }

    public static StoreQrToken issue(Store store, LocalDateTime now, Duration validity) {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return new StoreQrToken(store, token, now, now.plus(validity));
    }

    /** 회전(재발급) 시 이전 토큰에 호출 — 만료를 기다리지 않고 즉시 무효화한다. */
    public void revoke() {
        this.active = false;
    }

    /**
     * 이 토큰으로 출퇴근을 찍을 수 있는지 — 활성 상태이고 서버 시각 기준 유효기간 안이어야 한다.
     * 클라이언트가 보낸 시각은 신뢰하지 않는다(기기 시계 조작으로 만료 토큰을 되살릴 수 있다).
     */
    public boolean isUsableAt(LocalDateTime serverNow) {
        return active && serverNow.isBefore(expiresAt);
    }
}
