-- QR 출퇴근 토큰 (260807 마스터 실행계획서 WP-C)
--
-- iOS 1차 출시에서 NFC 가 빠져 GPS 만 남았는데 실내 오차가 크다. QR 은 두 플랫폼 모두 되고
-- 매장 비용이 종이 한 장이다.
--
-- 대리출근 방지: 정적 QR 은 사진 한 장으로 뚫리므로, 토큰을 난수로 발급하고 회전·만료시킨다.
-- 매장당 활성 토큰은 1개이며(재발급 시 이전 토큰 즉시 무효), 검증은 서버 시각 기준으로만 한다.

CREATE TABLE store_qr_token (
    store_qr_token_id BIGINT       NOT NULL AUTO_INCREMENT,
    store_id          BIGINT       NOT NULL,
    token             VARCHAR(64)  NOT NULL COMMENT 'QR 에 인코딩되는 난수 토큰(SecureRandom)',
    issued_at         DATETIME     NOT NULL,
    expires_at        DATETIME     NOT NULL COMMENT '유출된 QR 사진의 수명을 제한',
    active            TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '재발급 시 이전 토큰 즉시 무효화',
    PRIMARY KEY (store_qr_token_id),
    CONSTRAINT uq_store_qr_token_value UNIQUE (token),
    CONSTRAINT fk_store_qr_token_store FOREIGN KEY (store_id) REFERENCES store (store_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 출퇴근 검증은 token 으로 조회한 뒤 store 소속을 대조한다(타 매장 토큰 거부).
CREATE INDEX idx_store_qr_token_store ON store_qr_token (store_id);
