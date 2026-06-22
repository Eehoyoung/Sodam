-- PIPA §29: 개인정보(휴대폰 번호) 암호화 저장 대비 컬럼 확장.
-- StringCryptoConverter 가 AES/GCM 암호문(Base64 + prefix)을 저장하므로 평문 길이보다 길어진다.
-- phone VARCHAR(20) → VARCHAR(255) 로 확장. 기존 평문 값은 그대로 유지(무중단 전환 폴백).
--
-- ⚠️ 기존 평문 데이터 일괄 암호화(백필)는 본 마이그레이션에서 수행하지 않는다.
--    StringCryptoConverter 가 조회 시 평문/암호문을 prefix 로 구분하고,
--    해당 행이 다시 저장될 때 암호문으로 전환된다(점진 전환).
--    전체 즉시 전환이 필요하면 별도 백필 배치를 작성해 실행해야 한다(TODO).
--
-- TODO[보안]: birth_date 암호화는 date→varchar 타입 변경 + 포맷 손실 리스크로 본 단계 제외.
--             추후 birth_date_enc VARCHAR 컬럼 신설 + 마이그레이션으로 분리 처리.
ALTER TABLE `user`
    MODIFY COLUMN `phone` VARCHAR(255) NULL;
