-- SV-06: 추천 코드는 무작위 8자리로 발급하고, 역산 없이 인덱스로 조회한다.
CREATE TABLE referral_code_map (
    referral_code_map_id BIGINT      NOT NULL AUTO_INCREMENT,
    code                 VARCHAR(8)  NOT NULL,
    user_id              BIGINT      NOT NULL,
    created_at           DATETIME    NOT NULL,
    PRIMARY KEY (referral_code_map_id),
    CONSTRAINT uq_referral_code_map_code UNIQUE (code),
    CONSTRAINT uq_referral_code_map_user UNIQUE (user_id),
    CONSTRAINT fk_referral_code_map_user FOREIGN KEY (user_id) REFERENCES `user` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 이미 적용된 추천 이력은 코드 자체가 referral에 남아 있으므로 먼저 보존한다.
-- 미사용 코드까지 포함한 전체 사용자 이관은 앱 기동 후 Java runner가 기존 UUID 알고리즘으로 수행한다.
INSERT INTO referral_code_map (code, user_id, created_at)
SELECT referral_code, referrer_user_id, NOW()
FROM referral
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);
